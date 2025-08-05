import type { AudioSource } from "expo-audio";
import type { AudioSpriteSource } from "./types.ts";

export type { AudioSpriteSource, SpriteManifest, SpriteRule } from "./types.ts";
export type PylyAudioSource = AudioSource | AudioSpriteSource;

export function isAudioSpriteSource(
  source: PylyAudioSource,
): source is AudioSpriteSource {
  return typeof source === `object` && source != null && `type` in source;
}
