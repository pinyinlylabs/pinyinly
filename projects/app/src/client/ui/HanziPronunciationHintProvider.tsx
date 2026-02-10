import { useReplicache } from "@/client/hooks/useReplicache";
import { useUserSetting } from "@/client/hooks/useUserSetting";
import type { HanziText, PinyinUnit } from "@/data/model";
import type { currentSchema } from "@/data/rizzleSchema";
import type { RizzleReplicache } from "@/util/rizzle";
import { r } from "@/util/rizzle";
import { nanoid } from "@/util/nanoid";
import { normalizePinyinUnitForHintKey } from "@/data/pinyin";
import type { PropsWithChildren } from "react";
import { createContext } from "react";

export interface HanziPronunciationHintOverridesInput {
  hint?: string | null;
  explanation?: string | null;
  selectedHintImageId?: string | null;
}

export interface HanziPronunciationHintOverrides {
  hint?: string;
  explanation?: string;
  selectedHintImageId?: string;
  hasOverrides: boolean;
}

export interface HanziPronunciationHintContextValue {
  setHintOverrides: (
    hanzi: HanziText,
    pinyinUnit: PinyinUnit,
    overrides: HanziPronunciationHintOverridesInput,
  ) => void;
  clearHintOverrides: (hanzi: HanziText, pinyinUnit: PinyinUnit) => void;
}

const Context = createContext<HanziPronunciationHintContextValue | null>(null);

const hanziPronunciationHintTextSetting = r.entity(
  `hanziPronunciationHint.[hanzi].[pinyin].hint`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    t: r.string().alias(`t`),
  },
);

const hanziPronunciationHintExplanationSetting = r.entity(
  `hanziPronunciationHint.[hanzi].[pinyin].explanation`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    t: r.string().alias(`t`),
  },
);

export const hanziPronunciationHintImageSetting = r.entity(
  `hanziPronunciationHint.[hanzi].[pinyin].selectedHintImageId`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    t: r.string().alias(`t`),
  },
);

type RizzleCurrent = RizzleReplicache<typeof currentSchema>;

function normalizeHintKey(hanzi: HanziText, pinyinUnit: PinyinUnit) {
  return {
    hanzi,
    pinyin: normalizePinyinUnitForHintKey(pinyinUnit),
  };
}

export const HanziPronunciationHintProvider = Object.assign(
  function HanziPronunciationHintProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const rep = useReplicache() as RizzleCurrent;

    const setSettingValue = (
      entity:
        | typeof hanziPronunciationHintTextSetting
        | typeof hanziPronunciationHintExplanationSetting
        | typeof hanziPronunciationHintImageSetting,
      hanzi: HanziText,
      pinyinUnit: PinyinUnit,
      value: string | null | undefined,
    ) => {
      const keyParams = normalizeHintKey(hanzi, pinyinUnit);
      const marshaledValue =
        value == null
          ? null
          : entity.marshalValue({
              ...keyParams,
              t: value,
            });
      const storedValue =
        marshaledValue == null
          ? null
          : Object.fromEntries(
              Object.entries(marshaledValue as Record<string, unknown>).filter(
                ([key]) => key !== `h` && key !== `p`,
              ),
            );

      void rep.mutate.setSetting({
        key: entity.marshalKey(keyParams),
        value: storedValue,
        now: new Date(),
        historyId: nanoid(),
      });
    };

    const setHintOverrides = (
      hanzi: HanziText,
      pinyinUnit: PinyinUnit,
      overrides: HanziPronunciationHintOverridesInput,
    ): void => {
      if (`hint` in overrides) {
        setSettingValue(
          hanziPronunciationHintTextSetting,
          hanzi,
          pinyinUnit,
          overrides.hint,
        );
      }
      if (`explanation` in overrides) {
        setSettingValue(
          hanziPronunciationHintExplanationSetting,
          hanzi,
          pinyinUnit,
          overrides.explanation,
        );
      }
      if (`selectedHintImageId` in overrides) {
        setSettingValue(
          hanziPronunciationHintImageSetting,
          hanzi,
          pinyinUnit,
          overrides.selectedHintImageId,
        );
      }
    };

    const clearHintOverrides = (
      hanzi: HanziText,
      pinyinUnit: PinyinUnit,
    ): void => {
      setHintOverrides(hanzi, pinyinUnit, {
        hint: null,
        explanation: null,
        selectedHintImageId: null,
      });
    };

    return (
      <Context.Provider
        value={{
          setHintOverrides,
          clearHintOverrides,
        }}
      >
        {children}
      </Context.Provider>
    );
  },
  {
    Context,
  },
);

export function useHanziPronunciationHintOverrides(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
): HanziPronunciationHintOverrides {
  const keyParams = normalizeHintKey(hanzi, pinyinUnit);

  const hintSetting = useUserSetting(
    hanziPronunciationHintTextSetting,
    keyParams,
  );
  const explanationSetting = useUserSetting(
    hanziPronunciationHintExplanationSetting,
    keyParams,
  );
  const imageSetting = useUserSetting(
    hanziPronunciationHintImageSetting,
    keyParams,
  );

  const hint = hintSetting.value?.t ?? undefined;
  const explanation = explanationSetting.value?.t ?? undefined;
  const selectedHintImageId = imageSetting.value?.t ?? undefined;
  const hasOverrides =
    hint != null || explanation != null || selectedHintImageId != null;

  return { hint, explanation, selectedHintImageId, hasOverrides };
}
