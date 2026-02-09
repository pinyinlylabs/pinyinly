import { useReplicache } from "@/client/hooks/useReplicache";
import { useUserSetting } from "@/client/hooks/useUserSetting";
import type { HanziWord } from "@/data/model";
import type { currentSchema } from "@/data/rizzleSchema";
import { rHanziWord } from "@/data/rizzleSchema";
import type { RizzleReplicache } from "@/util/rizzle";
import { r } from "@/util/rizzle";
import { nanoid } from "@/util/nanoid";
import type { PropsWithChildren } from "react";
import { createContext } from "react";

export interface HanziWordHintOverridesInput {
  hint?: string | null;
  explanation?: string | null;
  selectedHintImageId?: string | null;
}

export interface HanziWordHintOverrides {
  hint?: string;
  explanation?: string;
  selectedHintImageId?: string;
  hasOverrides: boolean;
}

export interface HanziWordHintContextValue {
  /**
   * Set overrides for a hanziword hint.
   */
  setHintOverrides: (
    hanziWord: HanziWord,
    overrides: HanziWordHintOverridesInput,
  ) => void;

  /**
   * Clear all overrides for a hanziword hint.
   */
  clearHintOverrides: (hanziWord: HanziWord) => void;
}

const Context = createContext<HanziWordHintContextValue | null>(null);

const hanziWordMeaningHintTextSetting = r.entity(
  `hanziWordMeaningHint.[hanziWord].hint`,
  {
    hanziWord: rHanziWord().alias(`h`),
    t: r.string().alias(`t`),
  },
);

const hanziWordMeaningHintExplanationSetting = r.entity(
  `hanziWordMeaningHint.[hanziWord].explanation`,
  {
    hanziWord: rHanziWord().alias(`h`),
    t: r.string().alias(`t`),
  },
);

export const hanziWordMeaningHintImageSetting = r.entity(
  `hanziWordMeaningHint.[hanziWord].selectedHintImageId`,
  {
    hanziWord: rHanziWord().alias(`h`),
    t: r.string().alias(`t`),
  },
);

type RizzleCurrent = RizzleReplicache<typeof currentSchema>;

export const HanziWordHintProvider = Object.assign(
  function HanziWordHintProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const rep = useReplicache() as RizzleCurrent;

    const setSettingValue = (
      entity:
        | typeof hanziWordMeaningHintTextSetting
        | typeof hanziWordMeaningHintExplanationSetting
        | typeof hanziWordMeaningHintImageSetting,
      hanziWord: HanziWord,
      value: string | null | undefined,
    ) => {
      const marshaledValue =
        value == null
          ? null
          : entity.marshalValue({
              hanziWord,
              t: value,
            });
      const storedValue =
        marshaledValue == null
          ? null
          : Object.fromEntries(
              Object.entries(marshaledValue as Record<string, unknown>).filter(
                ([key]) => key !== `h`,
              ),
            );

      void rep.mutate.setSetting({
        key: entity.marshalKey({ hanziWord }),
        value: storedValue,
        now: new Date(),
        historyId: nanoid(),
      });
    };

    const setHintOverrides = (
      hanziWord: HanziWord,
      overrides: HanziWordHintOverridesInput,
    ): void => {
      if (`hint` in overrides) {
        setSettingValue(
          hanziWordMeaningHintTextSetting,
          hanziWord,
          overrides.hint,
        );
      }
      if (`explanation` in overrides) {
        setSettingValue(
          hanziWordMeaningHintExplanationSetting,
          hanziWord,
          overrides.explanation,
        );
      }
      if (`selectedHintImageId` in overrides) {
        setSettingValue(
          hanziWordMeaningHintImageSetting,
          hanziWord,
          overrides.selectedHintImageId,
        );
      }
    };

    const clearHintOverrides = (hanziWord: HanziWord): void => {
      setHintOverrides(hanziWord, {
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

export function useHanziWordHintOverrides(
  hanziWord: HanziWord,
): HanziWordHintOverrides {
  const hintSetting = useUserSetting(hanziWordMeaningHintTextSetting, {
    hanziWord,
  });
  const explanationSetting = useUserSetting(
    hanziWordMeaningHintExplanationSetting,
    { hanziWord },
  );
  const imageSetting = useUserSetting(hanziWordMeaningHintImageSetting, {
    hanziWord,
  });

  const hint = hintSetting.value?.t ?? undefined;
  const explanation = explanationSetting.value?.t ?? undefined;
  const selectedHintImageId = imageSetting.value?.t ?? undefined;
  const hasOverrides =
    hint != null || explanation != null || selectedHintImageId != null;

  return { hint, explanation, selectedHintImageId, hasOverrides };
}

export function useSelectedHint(hanziWord: HanziWord): string | undefined {
  return useHanziWordHintOverrides(hanziWord).hint;
}

export function useSelectedHintImageId(
  hanziWord: HanziWord,
): string | undefined {
  return useHanziWordHintOverrides(hanziWord).selectedHintImageId;
}
