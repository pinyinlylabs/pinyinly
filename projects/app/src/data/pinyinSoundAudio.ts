import type { PinyinSoundId } from "@/data/model";
import type { PylyAudioSource } from "@pinyinly/audio-sprites/client";

type ToneId = `1` | `2` | `3` | `4` | `5`;

// Strategy:
// Use a full pinyin unit example (e.g. bāng / bàng) for each sound page,
// rather than trying to play isolated partial sound units.
const soundAudioSourceById: Record<string, PylyAudioSource> = {
  // oxlint-disable-next-line import/no-commonjs
  "b-": require(`../assets/audio/pinyin/bang1-nova.m4a`),
  // oxlint-disable-next-line import/no-commonjs
  "-ang": require(`../assets/audio/pinyin/bang1-nova.m4a`),
};

const finalToneAudioSourceById: Record<string, PylyAudioSource> = {
  // oxlint-disable-next-line import/no-commonjs
  "-ang1": require(`../assets/audio/pinyin/bang1-nova.m4a`),
  // oxlint-disable-next-line import/no-commonjs
  "-ang4": require(`../assets/audio/pinyin/bang4-nova.m4a`),
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
  return soundAudioSourceById[soundId] ?? null;
}

export function getPinyinFinalToneAudioSource(
  finalSoundId: PinyinSoundId,
  tone: ToneId,
): PylyAudioSource {
  const audioId = buildPinyinFinalToneAudioId(finalSoundId, tone);
  return (
    finalToneAudioSourceById[audioId] ??
    soundAudioSourceById[finalSoundId] ??
    null
  );
}
