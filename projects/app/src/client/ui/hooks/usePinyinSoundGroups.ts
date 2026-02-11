import { useRizzleQuery } from "@/client/ui/hooks/useRizzleQuery";
import {
  pinyinSoundGroupNameSettingKey,
  pinyinSoundGroupThemeSettingKey,
} from "@/client/ui/hooks/useUserSetting";
import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupRanks,
  defaultPinyinSoundGroupThemes,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { nullIfEmpty } from "@/util/unicode";
import { sortComparatorNumber } from "@pinyinly/lib/collections";

export function usePinyinSoundGroups() {
  const chart = loadPylyPinyinChart();

  return useRizzleQuery([`usePinyinSoundGroups`], async (r, tx) => {
    const groups = [];

    for (const { id, sounds } of chart.soundGroups) {
      const [nameOverride, themeOverride] = await Promise.all([
        r.query.setting.get(tx, { key: pinyinSoundGroupNameSettingKey(id) }),
        r.query.setting.get(tx, { key: pinyinSoundGroupThemeSettingKey(id) }),
      ]);
      const nameValue = (nameOverride?.value as { t?: string } | null)?.t;
      const themeValue = (themeOverride?.value as { t?: string } | null)?.t;

      groups.push({
        id,
        name: nullIfEmpty(nameValue) ?? defaultPinyinSoundGroupNames[id] ?? ``,
        theme:
          nullIfEmpty(themeValue) ?? defaultPinyinSoundGroupThemes[id] ?? ``,
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
