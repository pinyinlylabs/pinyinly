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
});

/**
 * Audio sprite manifest structure that maps file hashes to sprite data.
 * The segments object maps hashes of original audio files to arrays containing:
 * [sprite file index, start time, duration]
 */
export type SpriteManifest = z.infer<typeof spriteManifestSchema>;
