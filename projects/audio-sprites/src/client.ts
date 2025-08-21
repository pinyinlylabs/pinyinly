import { invariant } from "@pinyinly/lib/invariant";
import type { AudioSource } from "expo-audio";
import type { AudioSpriteSource } from "./types.ts";

export type { AudioSpriteSource, SpriteManifest, SpriteRule } from "./types.ts";
export type PylyAudioSource = AudioSource | AudioSpriteSource;

export function isAudioSpriteSource(
  source: PylyAudioSource,
): source is AudioSpriteSource {
  return (
    typeof source === `object` &&
    source != null &&
    `asset` in source &&
    `duration` in source &&
    `start` in source
  );
}

export function resolveAudioSource(source: PylyAudioSource): {
  uri: string;
  range?: [start: number, duration: number];
} {
  if (isAudioSpriteSource(source)) {
    let uri;
    if (typeof source.asset === `string`) {
      uri = source.asset;
    } else if (typeof source.asset === `object`) {
      uri = source.asset?.uri;
    }
    invariant(uri != null, `Could not determine URI for audio source`, source);
    return {
      uri,
      range: [source.start, source.duration],
    };
  }

  invariant(
    typeof source === `string`,
    `Expected audio source to be a string, but found`,
    source,
  );

  return { uri: source };
}
