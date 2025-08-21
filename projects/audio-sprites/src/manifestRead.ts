import * as fs from "@pinyinly/lib/fs";
import { LRUCache } from "lru-cache";
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
export const findSpriteSegment = (
  manifest: DeepReadonly<SpriteManifest>,
  manifestPath: string,
  audioPath: string,
): {
  start: SpriteSegment[`start`];
  duration: SpriteSegment[`duration`];
  spritePath: string;
} | null => {
  // Convert to relative path from manifest directory for lookup
  const manifestDir = path.dirname(manifestPath);
  const relativePath = path.relative(manifestDir, audioPath);
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
  // Sprite files are stored in the outDir, so combine outDir with the sprite filename
  const absoluteSpriteFilePath = path.resolve(
    manifestDir,
    manifest.outDir,
    spriteFile,
  );

  return {
    start: segmentData.start,
    duration: segmentData.duration,
    spritePath: absoluteSpriteFilePath,
  };
};

interface CachedManifest {
  manifest: DeepReadonly<SpriteManifest> | null;
}

export function cachedManifestLoader(
  manifestPath: string,
): () => DeepReadonly<SpriteManifest> | null {
  // Cache manifests by path with a short TTL
  const cache = new LRUCache<string, CachedManifest>({
    max: 10, // Max 10 different manifest files
    ttl: 1000, // 1 second TTL

    // When the cache is getting hammered (e.g. during a build) extend the TTL of
    // the manifest cache.
    updateAgeOnGet: true,
  });

  return () => {
    const cached = cache.get(manifestPath);

    if (cached) {
      return cached.manifest;
    }

    // Cache miss or expired - load fresh
    const manifest = loadManifest(manifestPath);
    cache.set(manifestPath, {
      manifest,
    });

    return manifest;
  };
}
