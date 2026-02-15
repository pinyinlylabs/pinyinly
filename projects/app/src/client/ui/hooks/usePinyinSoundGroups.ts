import { useDb } from "@/client/ui/hooks/useDb";
import {
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupNameSettingKey,
  pinyinSoundGroupThemeSetting,
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
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

export function usePinyinSoundGroups() {
  const chart = loadPylyPinyinChart();
  const db = useDb();

  // Collect all relevant setting keys
  const relevantKeys = useMemo(() => {
    const keys: string[] = [];
    for (const { id } of chart.soundGroups) {
      keys.push(pinyinSoundGroupNameSettingKey(id));
      keys.push(pinyinSoundGroupThemeSettingKey(id));
    }
    return keys;
  }, [chart.soundGroups]);

  const { data: settings, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ setting: db.settingCollection })
        .where(({ setting }) => inArray(setting.key, relevantKeys)),
    [db.settingCollection, relevantKeys],
  );

  const groups = useMemo(() => {
    const result = [];

    for (const { id, sounds } of chart.soundGroups) {
      const nameKey = pinyinSoundGroupNameSettingKey(id);
      const themeKey = pinyinSoundGroupThemeSettingKey(id);

      const nameOverride = settings.find((s) => s.key === nameKey);
      const themeOverride = settings.find((s) => s.key === themeKey);

      const nameValueData = nameOverride?.value
        ? pinyinSoundGroupNameSetting.unmarshalValueSafe(nameOverride.value)
        : null;
      const themeValueData = themeOverride?.value
        ? pinyinSoundGroupThemeSetting.unmarshalValueSafe(themeOverride.value)
        : null;

      result.push({
        id,
        name:
          nullIfEmpty(nameValueData?.text) ??
          defaultPinyinSoundGroupNames[id] ??
          ``,
        theme:
          nullIfEmpty(themeValueData?.text) ??
          defaultPinyinSoundGroupThemes[id] ??
          ``,
        sounds,
      });
    }

    result.sort(
      sortComparatorNumber((g) => {
        return defaultPinyinSoundGroupRanks[g.id] ?? 100;
      }),
    );

    return result;
  }, [settings, chart.soundGroups]);

  return { data: groups, isLoading };
}
