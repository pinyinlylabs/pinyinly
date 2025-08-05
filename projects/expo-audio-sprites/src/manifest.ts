import { globSync } from "glob";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import nodePath from "node:path";
import type { SpriteManifest, SpriteRule } from "./types.ts";
import { spriteManifestSchema } from "./types.ts";

export const loadManifest = (manifestPath: string): SpriteManifest | null => {
  try {
    const manifestContent = fs.readFileSync(manifestPath, `utf-8`);
    const rawManifest = JSON.parse(manifestContent) as unknown;

    // Validate the manifest structure using Zod
    const parseResult = spriteManifestSchema.parse(rawManifest);

    return parseResult;
  } catch (error) {
    console.error(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      error,
    );
    return {
      spriteFiles: [],
      rules: [],
      segments: {},
    };
  }
};

export const hashFile = (filePath: string): string => {
  const fileContent = fs.readFileSync(filePath);
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

        return spriteName;
      }
    } catch (error) {
      console.warn(`Invalid regex pattern in rule: ${rule.match}`, error);
    }
  }

  return undefined;
};

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
 * Resolve include glob patterns to find matching audio files.
 * @param includePatterns Array of glob patterns to match
 * @param manifestDir Directory where the manifest.json is located (used as base for glob patterns)
 * @returns Array of file paths relative to manifestDir
 */
export const resolveIncludePatterns = (
  includePatterns: string[],
  manifestDir: string,
): string[] => {
  const allFiles: string[] = [];

  for (const pattern of includePatterns) {
    try {
      const files = globSync(pattern, {
        cwd: manifestDir,
        fs,
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
 * Get all input files for processing based on manifest include patterns.
 * @param manifest The sprite manifest containing include patterns
 * @param manifestPath Path to the manifest.json file
 * @returns Array of file paths relative to manifest directory
 */
export const getInputFiles = (
  manifest: SpriteManifest,
  manifestPath: string,
): string[] => {
  if (!manifest.include || manifest.include.length === 0) {
    return [];
  }

  const manifestDir = nodePath.dirname(manifestPath);
  return resolveIncludePatterns(manifest.include, manifestDir);
};

/**
 * Update manifest segments with files found using include patterns.
 * Creates placeholder segment entries for files that match the include patterns,
 * calculates sprite assignments based on rules, and generates sprite file names.
 * @param manifest The sprite manifest to update
 * @param manifestPath Path to the manifest.json file
 * @returns Updated manifest with populated segments and spriteFiles
 */
export const updateManifestSegments = (
  manifest: SpriteManifest,
  manifestPath: string,
): SpriteManifest => {
  // Get all files that match the include patterns
  const inputFiles = getInputFiles(manifest, manifestPath);

  if (inputFiles.length === 0) {
    return manifest;
  }

  const manifestDir = nodePath.dirname(manifestPath);
  const updatedSegments = { ...manifest.segments };

  // Map to track file paths and their hashes
  const fileHashMap = new Map<string, string>();

  // Hash each file and add placeholder segment data
  for (const relativePath of inputFiles) {
    const absolutePath = nodePath.resolve(manifestDir, relativePath);

    try {
      const fileHash = hashFile(absolutePath);
      fileHashMap.set(relativePath, fileHash);

      // Only add if not already present
      if (!(fileHash in updatedSegments)) {
        // Placeholder values: [spriteIndex, startTime, duration]
        // These will be updated when actual sprites are built
        updatedSegments[fileHash] = [0, 0, 0];
      }
    } catch (error) {
      console.warn(`Failed to hash file ${relativePath}:`, error);
    }
  }

  // Apply rules to determine sprite assignments
  const rules = manifest.rules;
  const spriteAssignments = generateSpriteAssignments(inputFiles, rules);

  // Generate sprite files based on assignments
  const spriteFiles: string[] = [];
  const spriteIndexMap = new Map<string, number>();

  let spriteIndex = 0;
  for (const [spriteName, filesInSprite] of spriteAssignments) {
    // Create a deterministic sprite filename by hashing the content of all files in the sprite
    const sortedFiles = [...filesInSprite].sort();
    const spriteContentHashes = sortedFiles
      .map((filePath) => fileHashMap.get(filePath))
      .filter((hash): hash is string => hash != null)
      .sort();

    // Create a combined hash of all file hashes in this sprite
    const combinedContent = spriteContentHashes.join(``);
    const spriteHash = hashFileContent(combinedContent);

    // Generate sprite filename: spriteName-hash.m4a
    const spriteFileName = `${spriteName}-${spriteHash.slice(0, 8)}.m4a`;
    spriteFiles.push(spriteFileName);
    spriteIndexMap.set(spriteName, spriteIndex);

    // Update segment data with correct sprite index
    for (const filePath of filesInSprite) {
      const fileHash = fileHashMap.get(filePath);
      if (fileHash != null && fileHash in updatedSegments) {
        updatedSegments[fileHash] = [spriteIndex, 0, 0]; // Still placeholder start/duration
      }
    }

    spriteIndex++;
  }

  // Handle files that don't match any rules - put them in a default sprite
  const unmatchedFiles = inputFiles.filter((filePath) => {
    const spriteName = applyRules(filePath, rules);
    return spriteName == null || spriteName.length === 0;
  });

  if (unmatchedFiles.length > 0) {
    // Create a default sprite for unmatched files
    const unmatchedHashes = unmatchedFiles
      .map((filePath) => fileHashMap.get(filePath))
      .filter((hash): hash is string => hash != null)
      .sort();

    if (unmatchedHashes.length > 0) {
      const combinedContent = unmatchedHashes.join(``);
      const spriteHash = hashFileContent(combinedContent);
      const spriteFileName = `unmatched-${spriteHash.slice(0, 8)}.m4a`;

      spriteFiles.push(spriteFileName);
      const unmatchedSpriteIndex = spriteIndex;

      // Update segment data for unmatched files
      for (const filePath of unmatchedFiles) {
        const fileHash = fileHashMap.get(filePath);
        if (fileHash != null && fileHash in updatedSegments) {
          updatedSegments[fileHash] = [unmatchedSpriteIndex, 0, 0];
        }
      }
    }
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
export const saveManifest = (
  manifest: SpriteManifest,
  manifestPath: string,
): void => {
  try {
    const manifestContent = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(manifestPath, manifestContent, `utf8`);
  } catch (error) {
    console.error(`Failed to save manifest to ${manifestPath}:`, error);
    throw error;
  }
};

/**
 * Synchronize manifest with filesystem by updating segments based on include patterns.
 * Loads manifest, scans filesystem, updates segments, and saves back to disk.
 * @param manifestPath Path to the manifest.json file
 * @returns The updated manifest
 */
export const syncManifestWithFilesystem = (
  manifestPath: string,
): SpriteManifest => {
  const manifest = loadManifest(manifestPath);

  if (!manifest) {
    throw new Error(`Failed to load manifest from ${manifestPath}`);
  }

  const updatedManifest = updateManifestSegments(manifest, manifestPath);
  saveManifest(updatedManifest, manifestPath);

  return updatedManifest;
};
