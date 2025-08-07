import * as fs from "@pinyinly/lib/fs";
import { execa } from "execa";
import path from "node:path";
import type { AudioFileInfo } from "./ffmpeg.ts";
import { generateSpriteCommand } from "./ffmpeg.ts";
import { loadManifest } from "./manifestRead.ts";
import {
  getInputFiles,
  hashFile,
  syncManifestWithFilesystem,
} from "./manifestWrite.ts";
import type { SpriteManifest } from "./types.ts";

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
  const { manifestPath, syncManifest = true } = options;

  // Check if manifest file exists
  if (!fs.existsSync(manifestPath)) {
    return {
      manifestExists: false,
      hashesUpToDate: false,
      spriteFilesExist: false,
      missingSpriteFiles: [],
      outdatedFiles: [],
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
  const inputFiles = getInputFiles(manifest, manifestPath);

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
    const spriteFilePath = path.resolve(manifestDir, spriteFile);

    if (!fs.existsSync(spriteFilePath)) {
      missingSpriteFiles.push(spriteFile);
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
  // First, sync the manifest to ensure it's up to date
  const manifest = await syncManifestWithFilesystem(manifestPath);
  const manifestDir = path.dirname(manifestPath);

  // Get all audio files grouped by sprite file path
  const spriteGroups = getAllAudioFilesBySprite(manifest);

  // Generate each sprite file
  for (const [spriteFilePath, audioFiles] of spriteGroups) {
    const spriteFileName = path.basename(spriteFilePath);
    const absoluteSpriteFilePath = path.resolve(manifestDir, spriteFilePath);

    // Check if sprite file already exists
    if (fs.existsSync(absoluteSpriteFilePath)) {
      continue;
    }

    // Generate ffmpeg command
    const command = generateSpriteCommand(audioFiles, spriteFilePath);

    // Execute ffmpeg command
    console.warn(`Generating sprite: ${spriteFileName}`);
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
 *
 * @param options Configuration options for verification
 * @returns Promise resolving to the check result
 */
export async function verifySprites(
  options: SpriteTestOptions,
): Promise<ManifestCheckResult> {
  const { autoRegenerate = false } = options;

  const result = await checkSpriteManifest(options);

  if (result.needsRegeneration && autoRegenerate) {
    console.warn(`Sprites need regeneration, auto-generating...`);

    try {
      await generateSprites(options.manifestPath);

      // Re-check after generation
      return await checkSpriteManifest({
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
 *
 * @param options Configuration options for the assertion
 */
export async function assertSpritesUpToDate(
  options: SpriteTestOptions,
): Promise<void> {
  const result = await verifySprites(options);

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
 * @returns Promise resolving to the check result
 */
export async function testSprites(
  manifestPath: string,
  autoRegenerate = false,
): Promise<ManifestCheckResult> {
  return await verifySprites({
    manifestPath,
    autoRegenerate,
    syncManifest: true,
  });
}
