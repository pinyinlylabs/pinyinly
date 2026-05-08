// oxlint-disable import/no-commonjs
import type {
  AudioSpriteSource,
  PylyAudioSource,
} from "@pinyinly/audio-sprites/client";
import { isAudioSpriteSource } from "@pinyinly/audio-sprites/client";
import { memoize0 } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import { z } from "zod/v4";

export const pinyinSoundRuntimeManifestSchema = z.object({
  spriteFiles: z.array(z.string()),
  segments: z.record(z.string(), z.string()),
});

const pinyinRuntimeManifest = pinyinSoundRuntimeManifestSchema.parse(
  require(`../assets/audio/manifest.pinyin.json`) as unknown,
);

// prettier-ignore
const spriteAssetsByFileName = new Map<
  string,
  AudioSpriteSource | AudioSpriteSource[`asset`]
>([
  // <pyly-glob-template glob="../assets/audio/sprites/pinyin-*.m4a" template="  [`${filenameWithoutExt}.m4a`, require(`${path}`)],">
  [`pinyin-a,ā,á,ǎ,à-b17c99d493fa.m4a`, require(`../assets/audio/sprites/pinyin-a,ā,á,ǎ,à-b17c99d493fa.m4a`)],
  [`pinyin-b-159033946119.m4a`, require(`../assets/audio/sprites/pinyin-b-159033946119.m4a`)],
  [`pinyin-c-2d9e5f2f4b25.m4a`, require(`../assets/audio/sprites/pinyin-c-2d9e5f2f4b25.m4a`)],
  [`pinyin-ch-b51df5bbdf31.m4a`, require(`../assets/audio/sprites/pinyin-ch-b51df5bbdf31.m4a`)],
  [`pinyin-d-36e045a5d3c7.m4a`, require(`../assets/audio/sprites/pinyin-d-36e045a5d3c7.m4a`)],
  [`pinyin-f-74c9cb621dda.m4a`, require(`../assets/audio/sprites/pinyin-f-74c9cb621dda.m4a`)],
  [`pinyin-g-798e2bbe5008.m4a`, require(`../assets/audio/sprites/pinyin-g-798e2bbe5008.m4a`)],
  [`pinyin-h-2382b2a85306.m4a`, require(`../assets/audio/sprites/pinyin-h-2382b2a85306.m4a`)],
  [`pinyin-j-fe92bccc2039.m4a`, require(`../assets/audio/sprites/pinyin-j-fe92bccc2039.m4a`)],
  [`pinyin-k-6d389f8b2027.m4a`, require(`../assets/audio/sprites/pinyin-k-6d389f8b2027.m4a`)],
  [`pinyin-l-b526029ad86f.m4a`, require(`../assets/audio/sprites/pinyin-l-b526029ad86f.m4a`)],
  [`pinyin-m-4b1279912df4.m4a`, require(`../assets/audio/sprites/pinyin-m-4b1279912df4.m4a`)],
  [`pinyin-n-3062f0617339.m4a`, require(`../assets/audio/sprites/pinyin-n-3062f0617339.m4a`)],
  [`pinyin-p-b8e74b904caf.m4a`, require(`../assets/audio/sprites/pinyin-p-b8e74b904caf.m4a`)],
  [`pinyin-q-92998af6d01b.m4a`, require(`../assets/audio/sprites/pinyin-q-92998af6d01b.m4a`)],
  [`pinyin-r-16fedfef9b82.m4a`, require(`../assets/audio/sprites/pinyin-r-16fedfef9b82.m4a`)],
  [`pinyin-s-3d4fff5cbad4.m4a`, require(`../assets/audio/sprites/pinyin-s-3d4fff5cbad4.m4a`)],
  [`pinyin-sh-a2bcf0384abf.m4a`, require(`../assets/audio/sprites/pinyin-sh-a2bcf0384abf.m4a`)],
  [`pinyin-t-67a04415c520.m4a`, require(`../assets/audio/sprites/pinyin-t-67a04415c520.m4a`)],
  [`pinyin-w-15ccde7b1249.m4a`, require(`../assets/audio/sprites/pinyin-w-15ccde7b1249.m4a`)],
  [`pinyin-x-a3ac0fd26675.m4a`, require(`../assets/audio/sprites/pinyin-x-a3ac0fd26675.m4a`)],
  [`pinyin-y-46b4bf76812d.m4a`, require(`../assets/audio/sprites/pinyin-y-46b4bf76812d.m4a`)],
  [`pinyin-z-65e3e200a635.m4a`, require(`../assets/audio/sprites/pinyin-z-65e3e200a635.m4a`)],
  [`pinyin-ē,é,ě,è-986e32e1fc6c.m4a`, require(`../assets/audio/sprites/pinyin-ē,é,ě,è-986e32e1fc6c.m4a`)],
  [`pinyin-ō,ǒ,ò-4844db90dc3b.m4a`, require(`../assets/audio/sprites/pinyin-ō,ǒ,ò-4844db90dc3b.m4a`)],
// </pyly-glob-template>
]);

function parseRuntimeSegmentValue(
  value: string,
  pinyin: string,
): [number, Array<[number, number]>] {
  const segmentSeparator = value.indexOf(`:`);
  if (segmentSeparator <= 0) {
    throw new Error(`Invalid runtime segment for ${pinyin}: ${value}`);
  }

  const spriteIndex = Number(value.slice(0, segmentSeparator));
  if (!Number.isInteger(spriteIndex) || spriteIndex < 0) {
    throw new Error(`Invalid sprite index for ${pinyin}: ${value}`);
  }

  const encodedClips = value.slice(segmentSeparator + 1);
  if (encodedClips.length === 0) {
    throw new Error(`Missing clip list for ${pinyin}: ${value}`);
  }

  const clips: Array<[number, number]> = [];

  for (const encodedClip of encodedClips.split(`,`)) {
    const clipSeparator = encodedClip.indexOf(`-`);
    if (clipSeparator <= 0) {
      throw new Error(`Invalid clip for ${pinyin}: ${encodedClip}`);
    }

    const start = Number(encodedClip.slice(0, clipSeparator));
    const duration = Number(encodedClip.slice(clipSeparator + 1));

    if (
      !Number.isFinite(start) ||
      start < 0 ||
      !Number.isFinite(duration) ||
      duration < 0
    ) {
      throw new Error(`Invalid clip timing for ${pinyin}: ${encodedClip}`);
    }

    clips.push([start, duration]);
  }

  return [spriteIndex, clips];
}

export const getAudioSourcesByPinyinMap = memoize0(
  (): ReadonlyMap<string, readonly PylyAudioSource[]> => {
    const byPinyin = new Map<string, readonly PylyAudioSource[]>();

    for (const [pinyin, encodedSegment] of Object.entries(
      pinyinRuntimeManifest.segments,
    )) {
      const [spriteIndex, clips] = parseRuntimeSegmentValue(
        encodedSegment,
        pinyin,
      );

      const spriteFileName = pinyinRuntimeManifest.spriteFiles[spriteIndex];
      const spriteAsset = nonNullable(
        spriteFileName == null
          ? undefined
          : spriteAssetsByFileName.get(spriteFileName),
        `Missing sprite asset for ${pinyin} in ${spriteFileName ?? `unknown`}`,
      );

      const normalizedSpriteAsset = isAudioSpriteSource(spriteAsset)
        ? spriteAsset.asset
        : spriteAsset;

      const audioSources = clips.map(
        ([start, duration]): AudioSpriteSource => ({
          asset: normalizedSpriteAsset,
          start,
          duration,
        }),
      );

      byPinyin.set(pinyin, audioSources);
    }

    return byPinyin;
  },
);
