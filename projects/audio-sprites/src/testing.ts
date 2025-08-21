import * as fs from "@pinyinly/lib/fs";
import { execa } from "execa";
import path from "node:path";
import { generateSpriteCommand } from "./ffmpeg.ts";
import { loadManifest } from "./manifestRead.ts";
import {
  applyRulesWithRule,
  getInputFiles,
  hashFile,
  syncManifestWithFilesystem,
} from "./manifestWrite.ts";
import type { AudioFileInfo, SpriteManifest } from "./types.ts";

/**
 * Result of checking the sprite manifest status.
 */
export interface ManifestCheckResult {
  /** Whether the manifest file exists */
  manifestExists: boolean;
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
  /** Whether sprites need to be regenerated */
  needsRegeneration: boolean;
}

/**
 * Options for sprite verification and generation.
 */
export interface SpriteTestOptions {
  /** Path to the manifest.json file */
  manifestPath: string;
  /** Whether to automatically regenerate sprites if needed (default: false) */
  autoRegenerate?: boolean;
  /** Whether to sync the manifest with filesystem before checking (default: true) */
  syncManifest?: boolean;
  /** Whether to automatically delete unused sprite files (default: false) */
  autoCleanup?: boolean;
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
  const { manifestPath, syncManifest = false } = options;

  // Check if manifest file exists
  if (!fs.existsSync(manifestPath)) {
    return {
      manifestExists: false,
      hashesUpToDate: false,
      spriteFilesExist: false,
      missingSpriteFiles: [],
      outdatedFiles: [],
      unusedSpriteFiles: [],
      needsRegeneration: true,
    };
  }

  let manifest: SpriteManifest;

  // Sync manifest with filesystem if requested
  if (syncManifest) {
    try {
      manifest = await syncManifestWithFilesystem(manifestPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to sync manifest: ${message}`);
    }
  } else {
    const loadedManifest = loadManifest(manifestPath);
    if (!loadedManifest) {
      throw new Error(`Failed to load manifest from ${manifestPath}`);
    }
    manifest = loadedManifest;
  }

  // Validate that all sprite template variables have corresponding named capture groups
  for (const rule of manifest.rules) {
    validateRuleVariables(rule);
  }

  const manifestDir = path.dirname(manifestPath);
  const inputFiles = await getInputFiles(manifest, manifestPath);

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

  for (const spriteFile of manifest.spriteFiles) {
    const spriteFilePath = path.resolve(
      manifestDir,
      manifest.outDir,
      spriteFile,
    );

    if (!fs.existsSync(spriteFilePath)) {
      missingSpriteFiles.push(spriteFile);
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
  const needsRegeneration = !hashesUpToDate || !spriteFilesExist;

  return {
    manifestExists: true,
    hashesUpToDate,
    spriteFilesExist,
    missingSpriteFiles,
    outdatedFiles,
    unusedSpriteFiles,
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
      filePath,
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
        const relativePath = path.relative(manifestDir, firstFile.filePath);
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
 * Verify that audio sprites are properly generated and up to date.
 * If sprites are missing or outdated, optionally regenerate them.
 * If unused sprite files exist, optionally clean them up.
 *
 * @param options Configuration options for verification
 * @returns Promise resolving to the check result
 */
export async function verifySprites(
  options: SpriteTestOptions,
): Promise<ManifestCheckResult> {
  const { autoRegenerate = false, autoCleanup = false } = options;

  let result = await checkSpriteManifest(options);

  // Handle cleanup of unused sprite files
  if (result.unusedSpriteFiles.length > 0 && autoCleanup) {
    console.warn(
      `Found ${result.unusedSpriteFiles.length} unused sprite files, cleaning up...`,
    );

    try {
      await cleanupUnusedSprites(
        options.manifestPath,
        result.unusedSpriteFiles,
      );

      // Re-check after cleanup to update the result
      result = await checkSpriteManifest({
        ...options,
        syncManifest: false, // No need to sync again
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup unused sprites: ${message}`);
    }
  }

  // Handle regeneration of missing/outdated sprites
  if (result.needsRegeneration && autoRegenerate) {
    console.warn(`Sprites need regeneration, auto-generating...`);

    try {
      await generateSprites(options.manifestPath);

      // Re-check after generation
      result = await checkSpriteManifest({
        ...options,
        syncManifest: false, // No need to sync again
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to auto-regenerate sprites: ${message}`);
    }
  }

  return result;
}

/**
 * Assert that sprites are properly generated and up to date.
 * Throws an error if sprites are missing or need regeneration.
 * Automatically deletes unused sprite files if autoCleanup is enabled.
 *
 * @param options Configuration options for the assertion
 */
export async function assertSpritesUpToDate(
  options: SpriteTestOptions,
): Promise<void> {
  const result = await verifySprites({
    ...options,
    autoCleanup: options.autoCleanup ?? true, // Default to true for cleanup
  });

  if (!result.manifestExists) {
    throw new Error(`Manifest file does not exist: ${options.manifestPath}`);
  }

  if (!result.hashesUpToDate) {
    throw new Error(
      `Audio file hashes are outdated. Files with outdated hashes: ${result.outdatedFiles.join(`, `)}`,
    );
  }

  if (!result.spriteFilesExist) {
    throw new Error(
      `Sprite files are missing: ${result.missingSpriteFiles.join(`, `)}`,
    );
  }

  if (result.unusedSpriteFiles.length > 0) {
    throw new Error(
      `Found unused sprite files in output directory. Run with autoCleanup: true to automatically delete them: ${result.unusedSpriteFiles.join(`, `)}`,
    );
  }

  if (result.needsRegeneration) {
    throw new Error(
      `Sprites need regeneration. Run with autoRegenerate: true or manually regenerate sprites.`,
    );
  }
}

/**
 * Test helper that checks sprite status and optionally auto-generates missing sprites.
 * This is the main function that should be called from app tests.
 *
 * @param manifestPath Path to the manifest.json file
 * @param autoRegenerate Whether to automatically regenerate sprites if needed
 * @param autoCleanup Whether to automatically delete unused sprite files
 * @returns Promise resolving to the check result
 */
export async function testSprites(
  manifestPath: string,
  autoFix = false,
): Promise<ManifestCheckResult> {
  return await verifySprites({
    manifestPath,
    autoRegenerate: autoFix,
    autoCleanup: autoFix,
    syncManifest: autoFix,
  });
}
