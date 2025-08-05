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
  /** Regex pattern to match file paths (relative to manifest.json) */
  match: z.string(),
  /** Template for sprite name using capture groups from match regex */
  sprite: z.string(),
});

/**
 * Zod schema for validating sprite manifest JSON structure.
 */
export const spriteManifestSchema = z.object({
  /** Array of sprite file paths */
  spriteFiles: z.array(z.string()),
  /** Map of original file hashes to [sprite index, start time, duration] */
  segments: z.record(
    z.string(),
    z.tuple([
      z.number().int().min(0), // sprite file index
      z.number().min(0), // start time
      z.number().min(0), // duration
    ]),
  ),
  /** Rules for automatically mapping files to sprites */
  rules: z.array(spriteRuleSchema),
  /** Glob patterns for input audio files to process */
  include: z.array(z.string()),
});

/**
 * Rule for mapping audio files to sprites based on regex patterns.
 */
export type SpriteRule = z.infer<typeof spriteRuleSchema>;

/**
 * Audio sprite manifest structure that maps file hashes to sprite data.
 * The segments object maps hashes of original audio files to arrays containing:
 * [sprite file index, start time, duration]
 */
export type SpriteManifest = z.infer<typeof spriteManifestSchema>;
