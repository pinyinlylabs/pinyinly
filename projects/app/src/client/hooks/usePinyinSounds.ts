import type { PinyinSoundId } from "@/data/model";
import { loadPylyPinyinChart } from "@/data/pinyin";
import { currentSchema } from "@/data/rizzleSchema";
import { useRizzleQueryPaged } from "./useRizzleQueryPaged";

export function usePinyinSounds() {
  const chart = loadPylyPinyinChart();

  return useRizzleQueryPaged(
    [`usePinyinSounds`],
    async (r) => {
      const sounds = new Map<
        PinyinSoundId,
        { name: string | null; label: string }
      >();

      await r.replicache.query(async (tx) => {
        for (const group of chart.soundGroups) {
          for (const soundId of group.sounds) {
            const userOverride = await r.query.pinyinSound.get(tx, { soundId });
            sounds.set(soundId, {
              name: userOverride?.name ?? null,
              label: chart.soundToCustomLabel[soundId] ?? soundId,
            });
          }
        }
      });

      return sounds;
    },
    [
      currentSchema.pinyinSound._def.interpolateKey({
        soundId: `` as PinyinSoundId,
      }),
    ],
  );
}
