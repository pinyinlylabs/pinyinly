import { analyzeAudioFileDuration, generateSpriteCommand } from "#ffmpeg.ts";
import type {
  AudioFileInfo,
  SpriteManifest,
  SpriteRule,
  SpriteSegment,
} from "#types.ts";
import {
  globSync,
  readFileSync,
  writeJsonFileIfChanged,
} from "@pinyinly/lib/fs";
import { nonNullable } from "@pinyinly/lib/invariant";
import * as crypto from "node:crypto";

import path from "node:path";
import { loadManifest } from "./manifestRead.ts";

/**
 * Generate sprite assignments for files based on rules.
 * This is a utility function that could be used by build tools to determine
 * which files should go into which sprites based on the rules in the manifest.
 *
 * @param files Array of file paths (relative to manifest)
 * @param rules Array of sprite rules to apply
 * @returns Map of sprite names to arrays of file paths
 */
export const generateSpriteAssignments = (
  files: string[],
  rules: SpriteRule[],
): Map<string, string[]> => {
  const assignments = new Map<string, string[]>();

  for (const file of files) {
    const spriteName = applyRules(file, rules);

    if (spriteName != null && spriteName.length > 0) {
      const existingFiles = assignments.get(spriteName) ?? [];
      existingFiles.push(file);
      assignments.set(spriteName, existingFiles);
    }
  }

  return assignments;
};

/**
 * Calculate frame-aligned start time for audio segments.
 * Audio segments should start at sample boundaries to avoid playback artifacts.
 * @param timeInSeconds The desired start time in seconds
 * @param sampleRateHz The sample rate of the audio (default: 44100 Hz)
 * @returns Frame-aligned time in seconds
 */
const getFrameAlignedTime = (
  timeInSeconds: number,
  sampleRateHz = 44_100,
): number => {
  return Math.ceil(timeInSeconds * sampleRateHz) / sampleRateHz;
};

/**
 * Create a sprite filename from a group of files with deterministic hashing.
 * @param spriteName Name prefix for the sprite file
 * @param audioFiles Array of audio file info for the sprite
 * @param fileHashMap Map of file paths to their content hashes
 * @param bitrate Audio bitrate for the sprite (defaults to "128k")
 * @returns The generated sprite filename
 */
const createSpriteFromFiles = (
  spriteName: string,
  audioFiles: AudioFileInfo[],
  fileHashMap: Map<string, string>,
  bitrate = `128k`,
): string => {
  // Sort files by path to ensure consistent ordering
  const sortedFiles = [...audioFiles].sort((a, b) =>
    a.filePath.localeCompare(b.filePath),
  );

  const hash = crypto.createHash(`sha256`);

  // Create a deterministic sprite filename by hashing all parameters that affect sprite content
  const spriteContentHashes = sortedFiles
    .map((audioFile) => fileHashMap.get(audioFile.filePath))
    .filter((hash): hash is string => hash != null);
  hash.update(JSON.stringify(spriteContentHashes));

  // Include the ffmpeg command used to generate the sprite
  // This ensures that any changes to the command will result in a different sprite file
  // This is important for reproducibility and cache invalidation.
  hash.update(
    JSON.stringify(generateSpriteCommand(sortedFiles, ``, 44_100, bitrate)),
  );

  // Generate sprite filename: spriteName-hash.m4a
  return `${spriteName}-${hash.digest(`hex`).slice(0, 12)}.m4a`;
};

/**
 * Update manifest segments based on current filesystem state.
 * Scans files matching patterns from rules, applies rules to determine sprite assignments,
 * and generates sprite files with content-based hashing.
 * Uses a single-pass strategy to process each input file once.
 * @param manifest The current sprite manifest
 * @param manifestPath Path to the manifest.json file (used to resolve relative paths)
 * @returns Updated manifest with current file segments and sprite assignments
 */
export const recomputeManifest = async (
  manifest: SpriteManifest,
  manifestPath: string,
): Promise<SpriteManifest> => {
  const manifestDir = path.dirname(manifestPath);
  const inputFiles = await getInputFiles(manifest, manifestPath);

  const updatedSegments: Record<string, SpriteSegment> = {};

  const fileHashMap = new Map<
    /* file name */ string,
    /* content hash */ string
  >();
  const fileDurationMap = new Map<
    /* file name */ string,
    /* duration in seconds */ number
  >();

  // Create a lookup map of existing segments by their content hash
  const existingSegmentsByHash = new Map<string, SpriteSegment>();
  for (const segment of Object.values(manifest.segments)) {
    existingSegmentsByHash.set(segment.hash, segment);
  }

  // Process each file to get hash and duration
  for (const relativePath of inputFiles) {
    const absolutePath = path.resolve(manifestDir, relativePath);

    try {
      const fileHash = hashFile(absolutePath);
      fileHashMap.set(relativePath, fileHash);

      // Check if we already have segment data for this content hash
      const existingSegment = existingSegmentsByHash.get(fileHash);

      const duration = existingSegment
        ? // Reuse duration from existing segment data (avoid calling ffmpeg)
          existingSegment.duration
        : // New file - analyze with ffmpeg to get duration
          await analyzeAudioFileDuration(absolutePath);

      fileDurationMap.set(relativePath, duration);
    } catch (error) {
      console.warn(`Failed to process file ${relativePath}:`, error);
    }
  }

  // Single-pass processing: Map each file to its sprite name and collect segments
  const spriteToSegments = new Map<string, AudioFileInfo[]>();
  const spriteToIndex = new Map<string, number>();
  const spriteToRule = new Map<string, SpriteRule>();
  const BUFFER_DURATION = 1; // 1 second of silence between segments

  for (const relativePath of inputFiles) {
    const duration = fileDurationMap.get(relativePath);
    const fileHash = fileHashMap.get(relativePath);

    if (duration === undefined || fileHash === undefined) {
      continue; // Skip files that failed to process
    }

    const absolutePath = path.resolve(manifestDir, relativePath);

    // Apply rules to determine sprite name and get the matched rule
    const ruleResult = applyRulesWithRule(relativePath, manifest.rules);
    const spriteName = ruleResult?.spriteName ?? `unmatched`;
    const matchedRule = ruleResult?.rule;

    // Add to sprite segments map
    if (!spriteToSegments.has(spriteName)) {
      spriteToIndex.set(spriteName, spriteToSegments.size);
      spriteToSegments.set(spriteName, []);
      if (matchedRule) {
        spriteToRule.set(spriteName, matchedRule);
      }
    }
    const segments = nonNullable(spriteToSegments.get(spriteName));
    const spriteIndex = nonNullable(spriteToIndex.get(spriteName));

    // Calculate start time for this segment (sum of previous durations + buffers)
    const startTime = getFrameAlignedTime(
      segments.reduce(
        (total, seg) => total + seg.duration + BUFFER_DURATION,
        0,
      ),
    );

    const audioFileInfo: AudioFileInfo = {
      filePath: absolutePath,
      startTime,
      duration,
      hash: fileHash,
    };
    segments.push(audioFileInfo);

    // Create segment entry for the manifest
    updatedSegments[relativePath] = {
      sprite: spriteIndex,
      start: audioFileInfo.startTime,
      duration: audioFileInfo.duration,
      hash: audioFileInfo.hash,
    };
  }

  // Generate sprite filenames and update segment references
  const updatedSpriteFiles: string[] = [];
  for (const [spriteName, segments] of spriteToSegments) {
    const spriteIndex = nonNullable(spriteToIndex.get(spriteName));
    const matchedRule = spriteToRule.get(spriteName);
    const bitrate = matchedRule?.bitrate ?? `128k`;
    const spriteFileName = createSpriteFromFiles(
      spriteName,
      segments,
      fileHashMap,
      bitrate,
    );
    updatedSpriteFiles[spriteIndex] = spriteFileName;
  }

  return {
    ...manifest,
    spriteFiles: updatedSpriteFiles,
    segments: updatedSegments,
  };
};

/**
 * Save a manifest object back to the filesystem.
 * @param manifest The sprite manifest to save
 * @param manifestPath Path where to save the manifest.json file
 */
export const saveManifest = async (
  manifest: SpriteManifest,
  manifestPath: string,
): Promise<void> => {
  await writeJsonFileIfChanged(manifestPath, manifest, 2);
};

/**
 * Synchronize manifest with filesystem by updating segments based on rules.
 * Loads manifest, scans filesystem, updates segments, and saves back to disk.
 * @param manifestPath Path to the manifest.json file
 * @returns The updated manifest
 */
export const syncManifestWithFilesystem = async (
  manifestPath: string,
): Promise<SpriteManifest> => {
  const manifest = loadManifest(manifestPath);

  if (!manifest) {
    throw new Error(`Failed to load manifest from ${manifestPath}`);
  }

  const updatedManifest = await recomputeManifest(manifest, manifestPath);
  await saveManifest(updatedManifest, manifestPath);

  return updatedManifest;
};

export const hashFile = (filePath: string): string => {
  const fileContent = readFileSync(filePath);
  return hashFileContent(fileContent);
};

export const hashFileContent = (fileContent: string | Buffer): string => {
  return crypto.createHash(`sha256`).update(fileContent).digest(`hex`);
};

/**
 * Apply sprite rules to determine which sprite a file should belong to.
 * @param filePath The file path relative to the manifest.json
 * @param rules Array of sprite rules to apply
 * @returns The sprite name if a rule matches, undefined otherwise
 */
export const applyRules = (
  filePath: string,
  rules: SpriteRule[],
): string | undefined => {
  const result = applyRulesWithRule(filePath, rules);
  return result?.spriteName;
};

/**
 * Apply sprite rules to determine which sprite a file should belong to and return the matched rule.
 * @param filePath The file path relative to the manifest.json
 * @param rules Array of sprite rules to apply
 * @returns Object with sprite name and matched rule if a rule matches, undefined otherwise
 */
export const applyRulesWithRule = (
  filePath: string,
  rules: SpriteRule[],
): { spriteName: string; rule: SpriteRule } | undefined => {
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.match);
      const match = regex.exec(filePath);

      if (match) {
        // Replace named capture groups and numbered groups in the sprite template
        let spriteName = rule.sprite;

        // Replace named capture groups ${groupName}
        if (match.groups) {
          for (const [groupName, groupValue] of Object.entries(match.groups)) {
            spriteName = spriteName.replaceAll(`\${${groupName}}`, groupValue);
          }
        }

        // Replace numbered capture groups $1, $2, etc.
        for (let i = 1; i < match.length; i++) {
          const matchValue = match[i];
          if (matchValue != null) {
            spriteName = spriteName.replaceAll(`$${i}`, matchValue);
          }
        }

        return { spriteName, rule };
      }
    } catch (error) {
      console.warn(`Invalid regex pattern in rule: ${rule.match}`, error);
    }
  }

  return undefined;
};

/**
 * Resolve include glob patterns to find matching audio files.
 * @param includePatterns Array of glob patterns to match
 * @param manifestDir Directory where the manifest.json is located (used as base for glob patterns)
 * @returns Array of file paths relative to manifestDir
 */
export const resolveIncludePatterns = async (
  includePatterns: string[],
  manifestDir: string,
): Promise<string[]> => {
  const allFiles: string[] = [];

  for (const pattern of includePatterns) {
    try {
      const files = globSync(pattern, {
        cwd: manifestDir,
        fs: await import(`node:fs`),
        posix: true, // Use posix-style paths for consistency
      });

      allFiles.push(...files);
    } catch (error) {
      console.warn(`Failed to resolve glob pattern "${pattern}":`, error);
    }
  }

  // Remove duplicates and sort for consistent ordering
  return [...new Set(allFiles)].sort();
};

/**
 * Get all input files for processing based on include patterns from rules.
 * @param manifest The sprite manifest containing rules with include patterns
 * @param manifestPath Path to the manifest.json file
 * @returns Array of file paths relative to manifest directory
 */
export const getInputFiles = async (
  manifest: SpriteManifest,
  manifestPath: string,
): Promise<string[]> => {
  const manifestDir = path.dirname(manifestPath);
  const allFiles: string[] = [];

  // Collect include patterns from all rules
  for (const rule of manifest.rules) {
    const filesFromRule = await resolveIncludePatterns(
      rule.include,
      manifestDir,
    );
    allFiles.push(...filesFromRule);
  }

  // Remove duplicates and sort for consistent ordering
  return [...new Set(allFiles)].sort();
};
