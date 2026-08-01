import { useDb } from "@/client/ui/hooks/useDb";
import {
  defaultPinyinSoundGroupRanks,
  defaultPinyinSoundGroupThemes,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import {
  pinyinSoundGroupNameTextSetting,
  pinyinSoundGroupThemeTextSetting,
} from "@/data/userSettings";
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
      keys.push(
        pinyinSoundGroupNameTextSetting.entity.marshalKey({ soundGroupId: id }),
      );
      keys.push(
        pinyinSoundGroupThemeTextSetting.entity.marshalKey({
          soundGroupId: id,
        }),
      );
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
      const themeKey = pinyinSoundGroupThemeTextSetting.entity.marshalKey({
        soundGroupId: id,
      });

      const themeOverride = settings.find((s) => s.key === themeKey);
      const themeValueData = pinyinSoundGroupThemeTextSetting.decode(
        { soundGroupId: id },
        themeOverride?.value ?? null,
      );

      result.push({
        id,
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
