import type { PinyinSoundId } from "@/data/model";
import type { PylyAudioSource } from "@pinyinly/audio-sprites/client";

type ToneId = `1` | `2` | `3` | `4` | `5`;

const audioSourceById: Record<string, PylyAudioSource> = {
  // oxlint-disable-next-line import/no-commonjs
  "-ang1": require(`../assets/audio/pinyin/-ang1-alloy.m4a`),
  // oxlint-disable-next-line import/no-commonjs
  "-ang2": require(`../assets/audio/pinyin/-ang2-alloy.m4a`),
};

export function buildPinyinFinalToneAudioId(
  finalSoundId: PinyinSoundId,
  tone: ToneId,
): `${PinyinSoundId}${ToneId}` {
  return `${finalSoundId}${tone}`;
}

export function getPinyinSoundAudioSource(
  soundId: PinyinSoundId,
): PylyAudioSource {
  return audioSourceById[soundId] ?? null;
}

export function getPinyinFinalToneAudioSource(
  finalSoundId: PinyinSoundId,
  tone: ToneId,
): PylyAudioSource {
  const audioId = buildPinyinFinalToneAudioId(finalSoundId, tone);
  return audioSourceById[audioId] ?? null;
}
