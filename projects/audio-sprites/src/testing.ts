import { parseDecimalFileSize } from "@pinyinly/lib/fileSize";
import * as fs from "@pinyinly/lib/fs";
import { glob } from "@pinyinly/lib/fs";
import chalk from "chalk";
import makeDebug from "debug";
import { execa } from "execa";
import { execSync } from "node:child_process";
import path from "node:path";
import type { chai } from "vitest";
import { expect, test } from "vitest";
import { analyzeAudioFile, generateSpriteCommand } from "./ffmpeg.ts";
import { loadManifest } from "./manifestRead.ts";
import {
  applyRulesWithRule,
  findUnmatchedFiles,
  getInputFiles,
  hashFile,
} from "./manifestWrite.ts";
import type { AudioFileInfo, SpriteManifest } from "./types.ts";

const debug = makeDebug(`pyly:audio-sprites`);

/**
 * Result of checking the sprite manifest status.
 */
export interface ManifestCheckResult {
  /** Whether the manifest file exists */
  manifestExists: boolean;
  /** Array of source files that do not match any sprite rule */
  unmatchedInputFiles: string[];
  /** Whether all source files have correct hashes in the manifest */
  hashesUpToDate: boolean;
  /** Whether all sprite files exist on disk */
  spriteFilesExist: boolean;
  /** Array of missing sprite files */
  missingSpriteFiles: string[];
  /** Array of files with outdated hashes */
  outdatedFiles: string[];
  /** Array of unused sprite files in the output directory */
  unusedSpriteFiles: string[];
  /** Sprite files that violate configured size bounds */
  spriteFileSizeViolations: SpriteFileSizeViolation[];
  /** Sprite file-size rules that did not match any sprite file */
  unusedSpriteFileSizeRules: string[];
  /** Whether sprites need to be regenerated */
  needsRegeneration: boolean;
}

export interface SpriteFileSizeViolation {
  spriteFile: string;
  sizeBytes: number;
  ruleName: string;
  minBytes?: number;
  maxBytes?: number;
}

export interface SpriteFileSizeRule {
  /** Regex used to match sprite file names (e.g. /^pinyin-/) */
  name: RegExp;
  minSize?: string;
  maxSize?: string;
}

/**
 * Options for sprite verification and generation.
 */
export interface SpriteTestOptions {
  /** Path to the manifest.json file */
  manifestPath: string;
  /** Whether to automatically sync/cleanup/regenerate sprite artifacts (default: false) */
  autoFix?: boolean;
  /** File-size rules for generated sprite files */
  spriteFileSizes?: SpriteFileSizeRule[];
}

interface ParsedSpriteFileSizeRule {
  regex: RegExp;
  minBytes?: number;
  maxBytes?: number;
}

/**
 * Delete unused sprite files from the output directory.
 * @param manifestPath Path to the manifest.json file
 * @param unusedFiles Array of unused sprite filenames to delete
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupUnusedSprites(
  manifestPath: string,
  unusedFiles: string[],
): Promise<void> {
  if (unusedFiles.length === 0) {
    return;
  }

  const manifest = loadManifest(manifestPath);
  if (!manifest) {
    throw new Error(`Failed to load manifest from ${manifestPath}`);
  }

  const manifestDir = path.dirname(manifestPath);
  const outDirPath = path.resolve(manifestDir, manifest.outDir);

  for (const unusedFile of unusedFiles) {
    const filePath = path.join(outDirPath, unusedFile);

    try {
      await fs.unlink(filePath);
      console.warn(`🗑️  Deleted unused sprite: ${unusedFile}`);
    } catch (error) {
      console.warn(`Failed to delete unused sprite ${unusedFile}:`, error);
    }
  }
}

/**
 * Validate that sprite template variables have corresponding named capture groups in the regex.
 * @param rule The sprite rule to validate
 * @throws Error if validation fails
 */
function validateRuleVariables(rule: { match: string; sprite: string }): void {
  // Extract variables from sprite template (${varName} format)
  const templateVariables = new Set<string>();
  const templateVariableMatches = rule.sprite.matchAll(/\$\{([^}]+)\}/g);
  for (const match of templateVariableMatches) {
    const variable = match[1];
    if (variable != null && variable.length > 0) {
      templateVariables.add(variable);
    }
  }

  // If no template variables, no validation needed
  if (templateVariables.size === 0) {
    return;
  }

  // Extract named capture groups from regex pattern
  let namedGroups: Set<string>;
  try {
    // Validate regex is syntactically correct
    new RegExp(rule.match);

    // Use the regex source to find named groups
    namedGroups = new Set<string>();
    const namedGroupMatches = rule.match.matchAll(/\(\?<([^>]+)>/g);
    for (const match of namedGroupMatches) {
      const groupName = match[1];
      if (groupName != null && groupName.length > 0) {
        namedGroups.add(groupName);
      }
    }
  } catch {
    // If regex is invalid, let it be handled elsewhere
    return;
  }

  // Check if all template variables have corresponding named capture groups
  const missingGroups: string[] = [];
  for (const variable of templateVariables) {
    if (!namedGroups.has(variable)) {
      missingGroups.push(variable);
    }
  }

  if (missingGroups.length > 0) {
    const firstMissingGroup = missingGroups[0];
    if (firstMissingGroup == null) {
      return; // Should never happen, but satisfy type checker
    }

    throw new Error(
      `Rule validation failed: sprite template references variables [${missingGroups.join(`, `)}] but regex pattern "${rule.match}" does not define corresponding named capture groups. ` +
        `Available named groups: [${[...namedGroups].join(`, `)}]. ` +
        `Add named capture groups like (?<${firstMissingGroup}>[^/]+) to your regex pattern.`,
    );
  }
}

export function parseSpriteFileSizeRules(
  rules: readonly SpriteFileSizeRule[],
): ParsedSpriteFileSizeRule[] {
  return rules.map((rule) => {
    const regex = rule.name;

    const minBytes =
      rule.minSize == null ? undefined : parseDecimalFileSize(rule.minSize);
    const maxBytes =
      rule.maxSize == null ? undefined : parseDecimalFileSize(rule.maxSize);

    if (minBytes != null && maxBytes != null && minBytes > maxBytes) {
      expect(maxBytes).toBeGreaterThanOrEqual(minBytes);
    }

    return {
      regex,
      minBytes,
      maxBytes,
    };
  });
}

/**
 * Check if the manifest.json file is up to date with correct hashes for all audio files
 * and verify that sprite files have been generated properly.
 *
 * @param options Configuration options for the check
 * @returns Promise resolving to the check result
 */
export async function checkSpriteManifest(
  options: SpriteTestOptions,
): Promise<ManifestCheckResult> {
  const fnDebug = debug.extend(
    `checkSpriteManifest()` satisfies HasNameOf<typeof checkSpriteManifest>,
  );

  const { manifestPath, spriteFileSizes = [] } = options;
  const parsedSpriteFileSizeRules = parseSpriteFileSizeRules(spriteFileSizes);

  // Check if manifest file exists
  if (!fs.existsSync(manifestPath)) {
    fnDebug(`Manifest file does not exist at path: %o`, manifestPath);
    return {
      manifestExists: false,
      unmatchedInputFiles: [],
      hashesUpToDate: false,
      spriteFilesExist: false,
      missingSpriteFiles: [],
      outdatedFiles: [],
      unusedSpriteFiles: [],
      spriteFileSizeViolations: [],
      unusedSpriteFileSizeRules: [],
      needsRegeneration: true,
    };
  }

  fnDebug(`Reading manifest from %o`, manifestPath);
  const loadedManifest = loadManifest(manifestPath);
  if (!loadedManifest) {
    throw new Error(`Failed to load manifest from ${manifestPath}`);
  }
  const manifest: SpriteManifest = loadedManifest;

  // Validate that all sprite template variables have corresponding named capture groups
  for (const rule of manifest.rules) {
    validateRuleVariables(rule);
  }

  const manifestDir = path.dirname(manifestPath);
  const inputFiles = await getInputFiles(manifest, manifestPath);
  const unmatchedInputFiles = findUnmatchedFiles(inputFiles, manifest.rules);

  if (unmatchedInputFiles.length > 0) {
    fnDebug(`unmatched input files: %o`, unmatchedInputFiles);
  }

  // Check if all source files have correct hashes
  const outdatedFiles: string[] = [];

  for (const relativePath of inputFiles) {
    const absolutePath = path.resolve(manifestDir, relativePath);

    if (!fs.existsSync(absolutePath)) {
      continue; // Skip missing files
    }

    const currentHash = hashFile(absolutePath);
    const segmentData = manifest.segments[relativePath];

    if (!segmentData || segmentData.hash !== currentHash) {
      outdatedFiles.push(relativePath);
    }
  }

  // Check if all sprite files exist
  const missingSpriteFiles: string[] = [];
  const spriteFileSizeViolations: SpriteFileSizeViolation[] = [];
  const usedSpriteFileSizeRules = new Set<string>();

  for (const spriteFile of manifest.spriteFiles) {
    const spriteFilePath = path.resolve(
      manifestDir,
      manifest.outDir,
      spriteFile,
    );

    const matchedRule = parsedSpriteFileSizeRules.find((rule) =>
      rule.regex.test(spriteFile),
    );
    if (matchedRule) {
      usedSpriteFileSizeRules.add(matchedRule.regex.source);
    }

    if (!fs.existsSync(spriteFilePath)) {
      fnDebug(`Missing sprite file: %o`, spriteFilePath);
      missingSpriteFiles.push(spriteFile);
      continue;
    }

    if (!matchedRule) {
      continue;
    }

    const sizeBytes = fs.statSync(spriteFilePath).size;

    if (matchedRule.minBytes != null && sizeBytes < matchedRule.minBytes) {
      spriteFileSizeViolations.push({
        spriteFile,
        sizeBytes,
        ruleName: matchedRule.regex.source,
        minBytes: matchedRule.minBytes,
        maxBytes: matchedRule.maxBytes,
      });
      continue;
    }

    if (matchedRule.maxBytes != null && sizeBytes > matchedRule.maxBytes) {
      spriteFileSizeViolations.push({
        spriteFile,
        sizeBytes,
        ruleName: matchedRule.regex.source,
        minBytes: matchedRule.minBytes,
        maxBytes: matchedRule.maxBytes,
      });
    }
  }

  // Check for unused sprite files in the output directory
  const unusedSpriteFiles: string[] = [];
  const outDirPath = path.resolve(manifestDir, manifest.outDir);

  if (fs.existsSync(outDirPath)) {
    try {
      const allFilesInOutDir = await fs.readdir(outDirPath);
      const expectedSpriteFiles = new Set(manifest.spriteFiles);
      const audioFilePattern = /\.(m4a|mp3|wav|aac|ogg)$/i;

      for (const file of allFilesInOutDir) {
        // Only consider audio files and check if they're not in the expected set
        if (audioFilePattern.test(file) && !expectedSpriteFiles.has(file)) {
          unusedSpriteFiles.push(file);
        }
      }

      // Sort for deterministic order
      unusedSpriteFiles.sort();
    } catch (error) {
      console.warn(`Failed to read output directory ${outDirPath}:`, error);
    }
  }

  const hashesUpToDate = outdatedFiles.length === 0;
  const spriteFilesExist = missingSpriteFiles.length === 0;
  const unusedSpriteFileSizeRules = parsedSpriteFileSizeRules
    .map((rule) => rule.regex.source)
    .filter((rule) => !usedSpriteFileSizeRules.has(rule));
  const needsRegeneration = !hashesUpToDate || !spriteFilesExist;
  fnDebug(`result: %o`, {
    unmatchedInputFiles,
    hashesUpToDate,
    spriteFilesExist,
    missingSpriteFiles,
    outdatedFiles,
    spriteFileSizeViolations,
    unusedSpriteFileSizeRules,
    needsRegeneration,
  });

  return {
    manifestExists: true,
    unmatchedInputFiles,
    hashesUpToDate,
    spriteFilesExist,
    missingSpriteFiles,
    outdatedFiles,
    unusedSpriteFiles,
    spriteFileSizeViolations,
    unusedSpriteFileSizeRules,
    needsRegeneration,
  };
}

/**
 * Get all audio files grouped by sprite file path from the manifest.
 * This is useful for getting a complete overview of all sprites and their files.
 *
 * @param manifest The sprite manifest containing segment data
 * @param manifestDir The directory where the manifest file is located
 * @returns Map of sprite file path to AudioFileInfo arrays
 */
export function getAllAudioFilesBySprite(
  manifest: SpriteManifest,
): Map<string, AudioFileInfo[]> {
  const spriteGroups = new Map<string, AudioFileInfo[]>();

  // Group files by sprite file path
  for (const [filePath, segment] of Object.entries(manifest.segments)) {
    const spriteIndex = segment.sprite;
    const spriteFilePath = manifest.spriteFiles[spriteIndex];

    if (spriteFilePath == null) {
      throw new Error(`No sprite file defined for index ${spriteIndex}`);
    }

    const audioFileInfo: AudioFileInfo = {
      relFilePath: filePath,
      startTime: segment.start,
      duration: segment.duration,
      hash: segment.hash,
    };

    const existingFiles = spriteGroups.get(spriteFilePath) ?? [];
    existingFiles.push(audioFileInfo);
    spriteGroups.set(spriteFilePath, existingFiles);
  }

  return spriteGroups;
}

/**
 * Generate sprite files using ffmpeg based on the manifest configuration.
 *
 * @param manifestPath Path to the manifest.json file
 * @returns Promise that resolves when all sprites have been generated
 */
export async function generateSprites(manifestPath: string): Promise<void> {
  const manifest = loadManifest(manifestPath);
  const manifestDir = path.dirname(manifestPath);

  if (!manifest) {
    throw new Error(`Failed to load manifest from ${manifestPath}`);
  }

  // Get all audio files grouped by sprite file path
  const spriteGroups = getAllAudioFilesBySprite(manifest);

  // Generate each sprite file
  for (const [spriteFileName, audioFiles] of spriteGroups) {
    const spriteFilePath = path.join(manifest.outDir, spriteFileName);
    const absoluteSpriteFilePath = path.resolve(manifestDir, spriteFilePath);

    // Check if sprite file already exists
    if (fs.existsSync(absoluteSpriteFilePath)) {
      continue;
    }

    // Determine bitrate for this sprite by checking which rule matches the first file
    let bitrate = `128k`; // default
    if (audioFiles.length > 0) {
      const firstFile = audioFiles[0];
      if (firstFile) {
        // Convert absolute path back to relative path to match against rules
        const relativePath = path.relative(manifestDir, firstFile.relFilePath);
        const ruleResult = applyRulesWithRule(relativePath, manifest.rules);
        if (
          ruleResult?.rule.bitrate != null &&
          ruleResult.rule.bitrate.length > 0
        ) {
          bitrate = ruleResult.rule.bitrate;
        }
      }
    }

    // Ensure the output directory exists
    const spriteDir = path.dirname(absoluteSpriteFilePath);
    if (!fs.existsSync(spriteDir)) {
      fs.mkdirSync(spriteDir, { recursive: true });
    }

    // Generate ffmpeg command with the determined bitrate
    const command = generateSpriteCommand(
      audioFiles,
      spriteFilePath,
      44_100,
      bitrate,
    );

    // Execute ffmpeg command
    console.warn(`Generating sprite: ${spriteFileName} (bitrate: ${bitrate})`);
    console.warn(`Running: ${command.join(` `)}`);

    try {
      const [ffmpegBin, ...args] = command;
      if (ffmpegBin == null) {
        throw new Error(`Invalid ffmpeg command generated`);
      }

      await execa(ffmpegBin, args, { cwd: manifestDir });
      console.warn(`✅ Generated: ${spriteFileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate sprite ${spriteFileName}: ${message}`,
      );
    }
  }
}

/**
 * Build helper that checks sprite status and optionally auto-generates missing sprites.
 * If sprites are missing or outdated, optionally regenerates them.
 * If unused sprite files exist, optionally cleans them up.
 *
 * @param options Configuration options for sprite building
 * @returns Promise resolving to the check result
 */
export async function buildSprites(
  options: SpriteTestOptions,
): Promise<ManifestCheckResult> {
  const fnDebug = debug.extend(
    `buildSprites()` satisfies HasNameOf<typeof buildSprites>,
  );

  fnDebug(`options: %o`, options);

  const { autoFix = false } = options;
  let result = await checkSpriteManifest(options);

  fnDebug(`checkSpriteManifest result: %j`, result);

  if (result.unmatchedInputFiles.length > 0) {
    fnDebug(
      `Skipping auto-fix because some input files do not match any sprite rule: %o`,
      result.unmatchedInputFiles,
    );
    return result;
  }

  // Handle cleanup of unused sprite files
  if (result.unusedSpriteFiles.length > 0 && autoFix) {
    fnDebug(
      `Found %s unused sprite files, cleaning up...`,
      result.unusedSpriteFiles.length,
    );

    try {
      await cleanupUnusedSprites(
        options.manifestPath,
        result.unusedSpriteFiles,
      );

      // Re-check after cleanup to update the result
      result = await checkSpriteManifest({
        ...options,
        autoFix: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup unused sprites: ${message}`);
    }
  }

  // Handle regeneration of missing/outdated sprites
  if (result.needsRegeneration && autoFix) {
    fnDebug(`Sprites need regeneration, auto-generating...`);

    try {
      await generateSprites(options.manifestPath);

      // Re-check after generation
      result = await checkSpriteManifest({
        ...options,
        autoFix: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to auto-regenerate sprites: ${message}`);
    }
  }

  return result;
}

/**
 * Build sprites and assert the final state using soft assertions so all issues are reported.
 *
 * @param options Configuration options for sprite building and file-size checks
 * @returns Promise resolving to the final check result
 */
export async function buildAndTestSprites(
  options: SpriteTestOptions,
): Promise<ManifestCheckResult> {
  const result = await buildSprites(options);

  expect.soft(result.manifestExists).toBe(true);
  expect.soft(result.unmatchedInputFiles).toEqual([]);
  expect.soft(result.hashesUpToDate).toBe(true);
  expect.soft(result.spriteFilesExist).toBe(true);
  expect.soft(result.needsRegeneration).toBe(false);
  expect.soft(result.missingSpriteFiles).toEqual([]);
  expect.soft(result.outdatedFiles).toEqual([]);
  expect.soft(result.unusedSpriteFiles).toEqual([]);
  expect.soft(result.spriteFileSizeViolations).toEqual([]);
  expect.soft(result.unusedSpriteFileSizeRules).toEqual([]);

  return result;
}

/**
 * Configuration options for input audio file testing.
 */
export interface InputFileTestOptions {
  /** Glob pattern for audio files to test */
  audioGlob: string;
  /** Target LUFS for loudness testing (default: -18) */
  targetLufs?: number;
  /** Allowed tolerance for loudness deviation (default: 1) */
  loudnessTolerance?: number;
  /** Allowed silence at start/end in seconds (default: 0.1) */
  allowedStartOrEndOffset?: number;
  /** Minimum duration for audio files in seconds (default: 0.5) */
  minDuration?: number;
  /** Tolerance for duration comparison in seconds (default: 0.05) */
  durationTolerance?: number;
  /** Project root path for relative path calculation */
  projectRoot?: string;
  /** Whether to automatically fix loudness issues by overwriting the original file (default: false) */
  autoFixLoudness?: boolean;
  /** Whether to automatically trim silence by overwriting the original file (default: false) */
  autoFixTrimSilence?: boolean;
  autoFixEmpty?: boolean;
  skipLoudness?: boolean;
}

const fixTag = `-fix`;

/**
 * Helper function to handle auto-fix or create a separate fix file.
 */
function handleAudioFix(options: {
  /** Function that takes a file path and returns the ffmpeg command for that path */
  fixCommand: (outputPath: string) => string;
  /** The absolute path to the original file */
  filePath: string;
  /** The relative path for display purposes */
  projectRelPath: string;
  /** The type of fix (e.g., "loudness" or "silence") for naming */
  fixType: string;
  /** Whether to overwrite the original file or create a separate fix file */
  autoFix: boolean;
  /** Whether to write a log file for the fix operation */
  writeLog?: boolean;
}): void {
  const {
    fixCommand,
    filePath,
    projectRelPath,
    fixType,
    autoFix,
    writeLog = false,
  } = options;

  // Create a fixed file with a deterministic name
  // FFmpeg can't write to the same file it's reading, so we always write to a separate file first
  const ext = path.extname(filePath);
  const fixedFilePath = `${filePath}-${fixType}${fixTag}${ext}`;
  const command = fixCommand(fixedFilePath);
  if (writeLog) {
    execSync(`(echo '% ${command}'; ${command}) > "${fixedFilePath}.log" 2>&1`);
  } else {
    execSync(command);
  }

  if (autoFix) {
    // Replace the original file with the fixed version
    fs.renameSync(fixedFilePath, filePath);
    console.warn(
      chalk.yellow(chalk.bold(`Auto-fixed ${fixType}:`), projectRelPath),
    );
  } else {
    console.warn(chalk.yellow(chalk.bold(`Created:`), fixedFilePath));
  }
}

/**
 * Create input file tests for audio files matching the given pattern.
 * This function generates vitest test cases for validating input audio files.
 *
 * @param options Configuration for input file testing
 */
export async function createAudioFileTests(
  options: InputFileTestOptions,
): Promise<void> {
  const {
    audioGlob,
    targetLufs = -18,
    loudnessTolerance = 1,
    allowedStartOrEndOffset = 0.1,
    minDuration = 0.1,
    durationTolerance = 0.05,
    projectRoot,
    autoFixLoudness = false,
    autoFixTrimSilence = false,
    autoFixEmpty = false,
    skipLoudness = false,
  } = options;

  const audioTestCases = (await glob(audioGlob))
    .filter((filePath) => !filePath.includes(fixTag))
    .map((filePath) => ({
      filePath,
      projectRelPath:
        projectRoot == null ? filePath : path.relative(projectRoot, filePath),
    }));

  test(`container and real duration is within allowable tolerance and not corrupted`, async () => {
    for (const { filePath, projectRelPath } of audioTestCases) {
      const { duration } = await analyzeAudioFile(filePath);

      const delta = Math.abs(duration.fromStream - duration.fromContainer);
      expect
        .soft(delta, `Duration mismatch for ${projectRelPath}`)
        .toBeLessThanOrEqual(durationTolerance);
    }
  });

  test(`audio file is not empty (based on duration)`, async () => {
    for (const { filePath, projectRelPath } of audioTestCases) {
      const { duration } = await analyzeAudioFile(filePath);

      try {
        // Skip the assertion since we've fixed the file
        expect
          .soft(duration.fromStream, `Audio file is empty: ${projectRelPath}`)
          .toBeGreaterThanOrEqual(minDuration);
      } catch (e) {
        if (isAssertionError(e) && autoFixEmpty) {
          fs.unlinkSync(filePath);
        } else {
          throw e;
        }
      }
    }
  });

  test.skipIf(skipLoudness)(
    `loudness is within allowed tolerance`,
    async () => {
      // ChatGPT recommends to target -18 LUFS because:
      //
      // | Use Case                     | Target LUFS                              | Notes                                                       |
      // | ---------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
      // | **Spotify / Apple Music**    | `-14 LUFS`                               | Most streaming platforms normalize to this                  |
      // | **YouTube**                  | `-14 to -13 LUFS`                        | YouTube doesn't officially disclose, but `-14 LUFS` is safe |
      // | **Podcast**                  | `-16 LUFS`                               | Mono or low-bandwidth optimized                             |
      // | **Broadcast (TV / Radio)**   | `-23 LUFS` (Europe) <br> `-24 LUFS` (US) | EBU R128 (Europe), ATSC A/85 (US)                           |
      // | **Game audio / apps**        | `-16 to -20 LUFS`                        | Depends on platform & purpose                               |
      // | **Speech for learning apps** | `-18 to -16 LUFS`                        | Good compromise between clarity and comfort                 |
      //
      // Target **-18 LUFS** because:
      //
      // - 🎧 Less aggressive than music
      // - 🧠 Good for repeated listening
      // - 📱 Comfortable on mobile speakers
      // - 🔄 Balances speech clarity and ear fatigue

      for (const { filePath, projectRelPath } of audioTestCases) {
        const { loudnorm } = await analyzeAudioFile(filePath);

        const loudness = loudnorm.input_i;
        const delta = Math.abs(loudness - targetLufs);

        // Check if loudness values are valid (not infinite or NaN)
        const hasInvalidValues =
          !Number.isFinite(loudnorm.input_i) ||
          !Number.isFinite(loudnorm.input_tp) ||
          !Number.isFinite(loudnorm.input_lra) ||
          !Number.isFinite(loudnorm.input_thresh) ||
          !Number.isFinite(loudnorm.target_offset);

        if (hasInvalidValues) {
          // Skip loudness test for files with invalid measurements (e.g., too short or silent)
          console.warn(
            chalk.yellow(
              `Skipping loudness test for ${projectRelPath}: invalid measurements (input_i=${loudnorm.input_i}, offset=${loudnorm.target_offset})`,
            ),
          );
          return;
        }

        if (delta > loudnessTolerance) {
          handleAudioFix({
            fixCommand: (outputPath) =>
              `ffmpeg -y -i "${filePath}" -af loudnorm=I=-18:TP=-1.5:LRA=5:linear=true:measured_I=${loudnorm.input_i}:measured_TP=${loudnorm.input_tp}:measured_LRA=${loudnorm.input_lra}:measured_thresh=${loudnorm.input_thresh}:offset=${loudnorm.target_offset}:print_format=summary "${outputPath}"`,
            filePath,
            projectRelPath,
            fixType: `loudness`,
            autoFix: autoFixLoudness,
          });

          if (autoFixLoudness) {
            // Skip the assertion since we've fixed the file
            return;
          }
        }

        expect
          .soft(delta, `Loudness delta for ${projectRelPath}`)
          .toBeLessThanOrEqual(loudnessTolerance);
      }
    },
  );

  test(`silence is trimmed`, async () => {
    for (const { filePath, projectRelPath } of audioTestCases) {
      const { silences, duration } = await analyzeAudioFile(filePath);

      const totalDuration = duration.fromStream;

      const expectedStart = 0;
      const expectedEnd = totalDuration;
      let start = expectedStart;
      let end = expectedEnd;

      for (const silence of silences) {
        // Check if silence is at the start
        if (silence.start <= allowedStartOrEndOffset) {
          start = Math.max(start, silence.end);
          continue;
        }

        // Check if silence is at the end
        if (silence.end >= totalDuration - allowedStartOrEndOffset) {
          end = Math.min(end, silence.start);
          continue;
        }
      }

      if (start > expectedStart || end < expectedEnd) {
        handleAudioFix({
          fixCommand: (outputPath) =>
            `ffmpeg -y -i "${filePath}" -af "atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS" "${outputPath}"`,
          filePath,
          projectRelPath,
          fixType: `silence`,
          autoFix: autoFixTrimSilence,
        });

        if (autoFixTrimSilence) {
          // Skip the assertion since we've fixed the file
          return;
        }
      }

      expect
        .soft(start, `Silence start for ${projectRelPath}`)
        .toBe(expectedStart);
      expect.soft(end, `Silence end for ${projectRelPath}`).toBe(expectedEnd);
    }
  });
}

function isAssertionError(
  error: unknown,
): error is ReturnType<typeof chai.use>[`AssertionError`] {
  return error instanceof Error && error.name === `AssertionError`;
}
