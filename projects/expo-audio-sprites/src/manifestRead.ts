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
    return null;
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
  if (manifest.include.length === 0) {
    return [];
  }

  const manifestDir = nodePath.dirname(manifestPath);
  return resolveIncludePatterns(manifest.include, manifestDir);
};
