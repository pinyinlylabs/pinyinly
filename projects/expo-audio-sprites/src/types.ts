import type { AudioSource } from "expo-audio";
import { z } from "zod/v4";

/**
 * Audio sprite source object created by the Babel transformation.
 * Contains metadata about the audio clip timing and the original asset.
 */
export interface AudioSpriteSource {
  /** Identifies this as an audio sprite object */
  type: `audiosprite`;
  /** Start time of the audio clip in seconds */
  start: number;
  /** Duration of the audio clip in seconds */
  duration: number;
  /** The original audio asset */
  asset: AudioSource;
}

/**
 * Configuration options for the audio sprite Babel plugin.
 */
export interface BabelPluginOptions {
  /** Path to the sprite manifest JSON file */
  manifestPath: string;
}

/**
 * Zod schema for validating sprite rules.
 */
export const spriteRuleSchema = z.object({
  /** Glob patterns for input audio files to process */
  include: z.array(z.string()),
  /** Regex pattern to match file paths (relative to manifest.json) */
  match: z.string(),
  /** Template for sprite filename (without directory path) using capture groups from match regex */
  sprite: z
    .string()
    .refine((value) => !value.includes(`/`) && !value.includes(`\\`), {
      message: `Sprite name must be a filename only, no directory separators allowed. Use outDir in manifest for output directory.`,
    }),
  /** Audio bitrate for the output sprite (e.g., "128k", "192k", "256k"). Defaults to "128k" if not specified. */
  bitrate: z.string().optional(),
});

/**
 * Zod schema for validating sprite segment data.
 */
export const spriteSegmentSchema = z.object({
  /** Index of the sprite file this segment belongs to */
  sprite: z.number().int().min(0),
  /** Start time of the segment within the sprite in seconds */
  start: z.number().min(0),
  /** Duration of the segment in seconds */
  duration: z.number().min(0),
  /** Content hash of the original audio file */
  hash: z.string(),
});

/**
 * Zod schema for validating sprite manifest JSON structure.
 */
export const spriteManifestSchema = z.object({
  /** Array of sprite file paths */
  spriteFiles: z.array(z.string()),
  /** Map of original file paths to segment data */
  segments: z.record(z.string(), spriteSegmentSchema),
  /** Rules for automatically mapping files to sprites */
  rules: z.array(spriteRuleSchema),
  /** Output directory for sprite files (relative to manifest.json) */
  outDir: z.string(),
});

/**
 * Rule for mapping audio files to sprites based on regex patterns.
 */
export type SpriteRule = z.infer<typeof spriteRuleSchema>;

/**
 * Segment data for an audio file within a sprite.
 */
export type SpriteSegment = z.infer<typeof spriteSegmentSchema>;

/**
 * Audio sprite manifest structure that maps file paths to sprite segment data.
 * The segments object maps relative paths of original audio files to objects containing:
 * { sprite: sprite file index, start: start time, duration: duration, hash: content hash }
 */
export type SpriteManifest = z.infer<typeof spriteManifestSchema>;

/**
 * Audio file info for sprite generation.
 */
export interface AudioFileInfo {
  /** Absolute path to the audio file */
  filePath: string;
  /** Expected start time in the sprite (in seconds) */
  startTime: number;
  /** Duration of the audio file (in seconds) */
  duration: number;
  hash: string;
}
