import type { HanziText, PinyinUnit } from "@/data/model";
import {
  pronunciationMnemonicSelectedSetting,
  pronunciationMnemonicTextSetting,
} from "@/data/userSettings";
import { like, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./useDb";
import { useUserSetting } from "./useUserSetting";
import { pinyinUnitId } from "@/data/pinyin";

export function useHanziPronunciationMnemonicId(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
): {
  selectedId: string | null;
  allIds: readonly string[];
} {
  const db = useDb();

  const { data: mnemonicTextSettings } = useLiveQuery(
    (q) =>
      q.from({ setting: db.settingCollection }).where(({ setting }) =>
        like(
          setting.key,
          pronunciationMnemonicTextSetting.entity.marshalKey({
            hanzi: hanzi,
            pinyin: pinyinUnitId(pinyinUnit),
            mnemonicId: `%`,
          }),
        ),
      ),
    [db.settingCollection, hanzi, pinyinUnit],
  );

  const allIds = [
    ...new Set(
      mnemonicTextSettings.map(
        (setting) =>
          pronunciationMnemonicTextSetting.entity.unmarshalKey(setting.key)
            .mnemonicId,
      ),
    ),
  ];

  const selectedMnemonicSetting = useUserSetting({
    setting: pronunciationMnemonicSelectedSetting,
    key: {
      hanzi,
      pinyin: pinyinUnitId(pinyinUnit),
    },
  });

  const selectedId = selectedMnemonicSetting.value?.mnemonicId ?? null;

  return {
    selectedId,
    allIds,
  };
}
