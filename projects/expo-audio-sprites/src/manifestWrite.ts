import { writeUtf8FileIfChanged } from "@pinyinly/lib/fs";
import { jsonStringifyShallowIndent } from "@pinyinly/lib/json";
import nodePath from "node:path";
import { analyzeAudioFile } from "./ffmpeg";
import {
  applyRules,
  getInputFiles,
  hashFile,
  hashFileContent,
  loadManifest,
} from "./manifestRead.ts";
import type { SpriteManifest, SpriteRule, SpriteSegment } from "./types.ts";

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
 * Create a sprite from a group of files and update their segment information.
 * @param spriteName Name prefix for the sprite file
 * @param files Array of file paths to include in the sprite
 * @param fileHashMap Map of file paths to their content hashes
 * @param fileDurationMap Map of file paths to their durations
 * @param segments Object containing segment information to update
 * @param spriteIndex Index of this sprite in the sprite files array
 * @param bufferDuration Duration of buffer between segments
 * @param sampleRate Sample rate for frame alignment
 * @returns The generated sprite filename
 */
const createSpriteFromFiles = (
  spriteName: string,
  files: string[],
  fileHashMap: Map<string, string>,
  fileDurationMap: Map<string, number>,
  segments: Record<string, SpriteSegment>,
  spriteIndex: number,
  bufferDuration: number,
  sampleRate: number,
): string => {
  // Sort files by path to ensure consistent ordering
  const sortedFiles = [...files].sort();

  // Create a deterministic sprite filename by hashing all parameters that affect sprite content
  const spriteContentHashes = sortedFiles
    .map((filePath) => fileHashMap.get(filePath))
    .filter((hash): hash is string => hash != null);
  // Note: Do NOT sort the hashes - they should match the file order

  // Include all parameters that affect the final sprite content in the hash
  const spriteParameters = {
    fileHashes: spriteContentHashes,
    bufferDuration,
    sampleRate,
    // Add more parameters here as needed (e.g., compression settings, audio format, etc.)
  };

  // Create a combined hash of all sprite parameters
  const parametersJson = JSON.stringify(spriteParameters);
  const spriteHash = hashFileContent(parametersJson);

  // Generate sprite filename: spriteName-hash.m4a
  const spriteFileName = `${spriteName}-${spriteHash.slice(0, 12)}.m4a`;

  // Calculate start times for each file in this sprite
  let currentTime = 0; // Start at the beginning of the sprite

  for (const filePath of sortedFiles) {
    const fileHash = fileHashMap.get(filePath);
    const duration = fileDurationMap.get(filePath) ?? 0;

    if (fileHash != null && segments[filePath] != null) {
      // Frame-align the start time
      const frameAlignedStartTime = getFrameAlignedTime(
        currentTime,
        sampleRate,
      );

      segments[filePath] = {
        sprite: spriteIndex,
        start: frameAlignedStartTime,
        duration,
        hash: fileHash,
      };

      // Move to the next position: current segment + buffer
      currentTime = frameAlignedStartTime + duration + bufferDuration;
    }
  }

  return spriteFileName;
};

/**
 * Update manifest segments based on current filesystem state.
 * Scans files matching include patterns, applies rules to determine sprite assignments,
 * and generates sprite files with content-based hashing.
 * @param manifest The current sprite manifest
 * @param manifestPath Path to the manifest.json file (used to resolve relative paths)
 * @returns Updated manifest with current file segments and sprite assignments
 */
export const updateManifestSegments = async (
  manifest: SpriteManifest,
  manifestPath: string,
): Promise<SpriteManifest> => {
  const manifestDir = nodePath.dirname(manifestPath);
  const inputFiles = getInputFiles(manifest, manifestPath);

  const updatedSegments: Record<string, SpriteSegment> = {
    ...manifest.segments,
  };

  const fileHashMap = new Map<string, string>();
  const fileDurationMap = new Map<string, number>();

  // Hash each file, get duration, and add segment data
  for (const relativePath of inputFiles) {
    const absolutePath = nodePath.resolve(manifestDir, relativePath);

    try {
      const [fileHash, analysisResult] = await Promise.all([
        hashFile(absolutePath),
        analyzeAudioFile(absolutePath),
      ]);

      fileHashMap.set(relativePath, fileHash);
      fileDurationMap.set(relativePath, analysisResult.duration.fromContainer);

      // Only add if not already present
      if (updatedSegments[relativePath] == null) {
        // Placeholder values: sprite index will be updated when sprites are assigned
        // start time will be set when actual sprites are built
        updatedSegments[relativePath] = {
          sprite: 0,
          start: 0,
          duration: analysisResult.duration.fromContainer,
          hash: fileHash,
        };
      } else {
        // Update duration and hash for existing entries
        const existingSegment = updatedSegments[relativePath];
        updatedSegments[relativePath] = {
          ...existingSegment,
          duration: analysisResult.duration.fromContainer,
          hash: fileHash,
        };
      }
    } catch (error) {
      console.warn(`Failed to process file ${relativePath}:`, error);
    }
  }

  // Apply rules to determine sprite assignments
  const rules = manifest.rules;
  const spriteAssignments = generateSpriteAssignments(inputFiles, rules);

  // Generate sprite files based on assignments and calculate start times
  const spriteFiles: string[] = [];
  const BUFFER_DURATION = 1; // 1 second of silence between segments
  const SAMPLE_RATE = 44_100; // Sample rate used for frame alignment

  for (const [spriteName, filesInSprite] of spriteAssignments) {
    const spriteIndex = spriteFiles.length;
    const spriteFileName = createSpriteFromFiles(
      spriteName,
      filesInSprite,
      fileHashMap,
      fileDurationMap,
      updatedSegments,
      spriteIndex,
      BUFFER_DURATION,
      SAMPLE_RATE,
    );
    spriteFiles.push(spriteFileName);
  }

  // Handle files that don't match any rules - put them in a default sprite
  const unmatchedFiles = inputFiles.filter((filePath) => {
    const spriteName = applyRules(filePath, rules);
    return spriteName == null || spriteName.length === 0;
  });

  if (unmatchedFiles.length > 0) {
    const unmatchedSpriteIndex = spriteFiles.length;
    const spriteFileName = createSpriteFromFiles(
      `unmatched`,
      unmatchedFiles,
      fileHashMap,
      fileDurationMap,
      updatedSegments,
      unmatchedSpriteIndex,
      BUFFER_DURATION,
      SAMPLE_RATE,
    );
    spriteFiles.push(spriteFileName);
  }

  return {
    ...manifest,
    spriteFiles,
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
  await writeUtf8FileIfChanged(
    manifestPath,
    jsonStringifyShallowIndent(manifest, 1),
  );
};

/**
 * Synchronize manifest with filesystem by updating segments based on include patterns.
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

  const updatedManifest = await updateManifestSegments(manifest, manifestPath);
  await saveManifest(updatedManifest, manifestPath);

  return updatedManifest;
};
