import { useRizzleQuery } from "@/client/hooks/useRizzleQuery";
import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupRanks,
  defaultPinyinSoundGroupThemes,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { sortComparatorNumber } from "@/util/collections";
import { nullIfEmpty } from "@/util/unicode";

export function usePinyinSoundGroups() {
  const chart = loadPylyPinyinChart();

  return useRizzleQuery([`usePinyinSoundGroups`], async (r, tx) => {
    const groups = [];

    for (const { id, sounds } of chart.soundGroups) {
      const userOverride = await r.query.pinyinSoundGroup.get(tx, {
        soundGroupId: id,
      });
      groups.push({
        id,
        name:
          nullIfEmpty(userOverride?.name) ??
          defaultPinyinSoundGroupNames[id] ??
          ``,
        theme:
          nullIfEmpty(userOverride?.theme) ??
          defaultPinyinSoundGroupThemes[id] ??
          ``,
        sounds,
      });
    }

    groups.sort(
      sortComparatorNumber((g) => {
        return defaultPinyinSoundGroupRanks[g.id] ?? 100;
      }),
    );

    return groups;
  });
}
