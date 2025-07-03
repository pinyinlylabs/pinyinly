import type { PinyinSoundId } from "@/data/model";
import { loadHhhPinyinChart } from "@/data/pinyin";
import { useRizzleQuery } from "./useRizzleQuery";

export function usePinyinSounds() {
  const chart = loadHhhPinyinChart();

  return useRizzleQuery([`usePinyinSounds`], async (r, tx) => {
    const sounds = new Map<
      PinyinSoundId,
      { name: string | null; label: string }
    >();

    for (const group of chart.soundGroups) {
      for (const soundId of group.sounds) {
        const userOverride = await r.query.pinyinSound.get(tx, { soundId });
        sounds.set(soundId, {
          name: userOverride?.name ?? null,
          label: chart.soundToCustomLabel[soundId] ?? soundId,
        });
      }
    }

    return sounds;
  });
}
