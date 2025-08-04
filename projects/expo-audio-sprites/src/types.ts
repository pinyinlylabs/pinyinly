import type { AudioSource } from "expo-audio";

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
