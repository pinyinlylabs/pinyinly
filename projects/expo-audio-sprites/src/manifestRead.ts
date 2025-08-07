import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import type { DeepReadonly } from "ts-essentials";
import type { SpriteManifest, SpriteSegment } from "./types.ts";
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

/**
 * Find an audio segment in the manifest based on file paths and resolve sprite information.
 * This function handles all the relative path calculations needed to look up audio files
 * in the manifest and returns the corresponding sprite information.
 *
 * @param manifest The sprite manifest to search in
 * @param manifestPath Absolute path to the manifest.json file
 * @param currentFilePath Absolute path to the JavaScript file making the require() call
 * @param audioRequirePath The require path (e.g., './sounds/beep.m4a') from the JS file
 * @returns Sprite information if found, null if not found or invalid
 */
export const findAudioSegment = (
  manifest: DeepReadonly<SpriteManifest>,
  manifestPath: string,
  currentFilePath: string,
  audioRequirePath: string,
): {
  segment: SpriteSegment;
  spriteFilePath: string;
} | null => {
  // Resolve the require path relative to the current file being transformed
  const resolvedAudioPath = path.resolve(
    path.dirname(currentFilePath),
    audioRequirePath,
  );

  // Convert to relative path from manifest directory for lookup
  const manifestDir = path.dirname(manifestPath);
  const relativePath = path.relative(manifestDir, resolvedAudioPath);
  const segmentData = manifest.segments[relativePath];

  if (segmentData === undefined) {
    // File not found in manifest
    return null;
  }

  // Extract sprite data from the segment object
  const { sprite: spriteIndex } = segmentData;
  const spriteFile = manifest.spriteFiles[spriteIndex];

  if (spriteFile === undefined) {
    console.warn(
      `Invalid sprite index ${spriteIndex} for segment ${relativePath}`,
    );
    return null;
  }

  // Resolve the sprite file path relative to the manifest location
  const absoluteSpriteFilePath = path.resolve(manifestDir, spriteFile);

  // Make the sprite file path relative to the current file being transformed
  const currentFileDir = path.dirname(currentFilePath);
  const relativeSpriteFilePath = path.relative(
    currentFileDir,
    absoluteSpriteFilePath,
  );

  // Ensure the path starts with ./ or ../ for proper require resolution
  const normalizedSpriteFilePath = relativeSpriteFilePath.startsWith(`.`)
    ? relativeSpriteFilePath
    : `./${relativeSpriteFilePath}`;

  return {
    segment: segmentData,
    spriteFilePath: normalizedSpriteFilePath,
  };
};
