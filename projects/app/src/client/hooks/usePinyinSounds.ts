import type { PinyinSoundId } from "@/data/model";
import { currentSchema } from "@/data/rizzleSchema";
import { useRizzleQueryPaged } from "./useRizzleQueryPaged";

export function usePinyinSounds() {
  return useRizzleQueryPaged(
    [`usePinyinSounds`],
    async (r) =>
      await r.queryPaged.pinyinSound
        .scan()
        .toArray()
        .then(
          (x) =>
            new Map(
              x.map(([, { soundId, name }]) => {
                return [
                  soundId,
                  {
                    name,
                  },
                ] as const;
              }),
            ),
        ),
    [
      currentSchema.pinyinSound._def.interpolateKey({
        soundId: `` as PinyinSoundId,
      }),
    ],
  );
}
