import type {
  HanziText,
  HanziWord,
  PinyinSoundGroupId,
  PinyinSoundId,
  PinyinUnit,
} from "@/data/model";
import { normalizePinyinUnitForHintKey } from "@/data/pinyin";
import {
  rHanziWord,
  rPinyinSoundGroupId,
  rPinyinSoundId,
} from "@/data/rizzleSchema";
import { nanoid } from "@/util/nanoid";
import { keyPathVariableNames, r } from "@/util/rizzle";
import type {
  RizzleAnyEntity,
  RizzleBoolean,
  RizzleEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
  RizzleType,
  RizzleTypeAlias,
  RizzleTypeDef,
} from "@/util/rizzle";
import type { Flatten } from "@pinyinly/lib/types";
import { useReplicache } from "./useReplicache";
import { useRizzleQuery } from "./useRizzleQuery";

export type UserSettingEntity = RizzleAnyEntity;
export type UserSettingKeyInput<T extends UserSettingEntity> = Parameters<
  T[`marshalKey`]
>[0];
export type UserSettingEntityInput<T extends UserSettingEntity> =
  Flatten<RizzleEntityInput<T> | null>;
export type UserSettingEntityOutput<T extends UserSettingEntity> =
  RizzleEntityOutput<T> | null;

// A user setting entity that has a `text` field
export type UserSettingTextEntity = RizzleEntity<
  string,
  { text: RizzleType<RizzleTypeDef, string, string, string> }
>;

// A user setting entity that has an `imageId` field
export type UserSettingImageEntity = RizzleEntity<
  string,
  { imageId: RizzleType<RizzleTypeDef, string, string, string> }
>;

export interface UseUserSettingResult<T extends UserSettingEntity> {
  isLoading: boolean;
  value: UserSettingEntityOutput<T>;
  setValue: UseUserSettingSetValue<T>;
}

export interface UserSettingSetOptions {
  skipHistory?: boolean;
}

export interface UserSettingHistoryEntry<T extends UserSettingEntity> {
  id: string;
  createdAt: Date;
  value: UserSettingEntityOutput<T>;
}

export type UseUserSettingUpdateFn<T extends UserSettingEntity> = (
  prev: UserSettingEntityOutput<T>,
  isLoading: boolean,
) => UserSettingEntityInput<T>;

export type UseUserSettingSetValue<T extends UserSettingEntity> = (
  value: UserSettingEntityInput<T> | UseUserSettingUpdateFn<T>,
  options?: UserSettingSetOptions,
) => void;

function getSettingKeyInfo<T extends UserSettingEntity>(
  userSettingEntity: T,
  keyParams: UserSettingKeyInput<T>,
) {
  const settingKey = userSettingEntity.marshalKey(keyParams);
  const valueShape = (
    userSettingEntity._def.valueType as unknown as {
      _def: { shape: Record<string, RizzleType> };
    }
  )._def.shape;
  const keyParamNames = keyPathVariableNames(userSettingEntity._def.keyPath);
  const keyParamAliases = keyParamNames.map((name) => {
    const type = valueShape[name];
    return type == null ? name : (type._getAlias() ?? name);
  });

  const keyParamMarshaled: Record<string, string> = {};
  for (const name of keyParamNames) {
    const type = valueShape[name];
    if (type == null) {
      continue;
    }
    const alias = type._getAlias() ?? name;
    const rawValue = (keyParams as Record<string, unknown>)[name];
    if (rawValue == null) {
      continue;
    }
    keyParamMarshaled[alias] = type.marshal(rawValue) as string;
  }

  return { settingKey, keyParamAliases, keyParamMarshaled, valueShape };
}

const noKeyParams = {} as const; // allow memoization inside rizzle
export const useUserSetting = <T extends UserSettingEntity>(
  userSettingEntity: T,
  keyParams?: UserSettingKeyInput<T>,
): UseUserSettingResult<T> => {
  const keyInput = (keyParams ?? noKeyParams) as UserSettingKeyInput<T>;
  const { settingKey, keyParamAliases, keyParamMarshaled } = getSettingKeyInfo(
    userSettingEntity,
    keyInput,
  );
  const r = useReplicache();

  const result = useRizzleQuery([`UserSetting`, settingKey], async (r, tx) => {
    const value = await r.query.setting.get(tx, { key: settingKey });
    return value ?? null;
  });

  const isLoading = result.isPending;
  const value =
    result.data?.value == null
      ? null
      : userSettingEntity.unmarshalValue({
          ...keyParamMarshaled,
          ...result.data.value,
        });

  const setValue: UseUserSettingSetValue<T> = (updater, options) => {
    if (typeof updater === `function`) {
      updater = updater(value, isLoading);
    }

    const nextValue = updater ?? null;
    const marshaledValue =
      nextValue == null
        ? null
        : userSettingEntity.marshalValue({
            ...(keyInput as Record<string, unknown>),
            ...(nextValue as Record<string, unknown>),
          } as RizzleEntityInput<T>);
    const strippedValue =
      marshaledValue == null || keyParamAliases.length === 0
        ? marshaledValue
        : Object.fromEntries(
            Object.entries(marshaledValue as Record<string, unknown>).filter(
              ([key]) => !keyParamAliases.includes(key),
            ),
          );
    const skipHistory = options?.skipHistory === true;

    void r.mutate
      .setSetting({
        key: settingKey,
        value: strippedValue ?? null,
        now: new Date(),
        skipHistory,
        historyId: skipHistory ? undefined : nanoid(),
      })
      .catch((error: unknown) => {
        console.error(`Failed to set user setting "${settingKey}":`, error);
      });
  };

  return { isLoading, value, setValue };
};

export function useUserSettingHistory<T extends UserSettingEntity>(
  userSettingEntity: T,
  keyParams?: UserSettingKeyInput<T>,
): {
  isLoading: boolean;
  entries: UserSettingHistoryEntry<T>[];
} {
  const keyInput = (keyParams ?? noKeyParams) as UserSettingKeyInput<T>;
  const { settingKey, keyParamMarshaled } = getSettingKeyInfo(
    userSettingEntity,
    keyInput,
  );

  const result = useRizzleQuery(
    [`UserSettingHistory`, settingKey],
    async (r, tx) => {
      const history = await r.query.settingHistory
        .byKey(tx, settingKey)
        .toArray();
      return history.map(([, entry]) => entry);
    },
  );

  const entries = (result.data ?? [])
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      value:
        entry.value == null
          ? null
          : userSettingEntity.unmarshalValue({
              ...keyParamMarshaled,
              ...(entry.value as Record<string, unknown>),
            }),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { isLoading: result.isPending, entries };
}

export type UserSettingToggleableEntity = RizzleEntity<
  string,
  { enabled: RizzleBoolean | RizzleTypeAlias<RizzleBoolean> }
>;

//
// Settings
//

export const autoCheckUserSetting = r.entity(`autoCheck`, {
  enabled: r.boolean(`e`),
}) satisfies UserSettingToggleableEntity;

export const pinyinSoundNameSetting = r.entity(`psn.[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  text: r.string().alias(`t`),
});

export const pinyinSoundGroupNameSetting = r.entity(`psgn.[soundGroupId]`, {
  soundGroupId: rPinyinSoundGroupId().alias(`g`),
  text: r.string().alias(`t`),
});

export const pinyinSoundGroupThemeSetting = r.entity(`psgt.[soundGroupId]`, {
  soundGroupId: rPinyinSoundGroupId().alias(`g`),
  text: r.string().alias(`t`),
});

export function pinyinSoundNameSettingKey(soundId: PinyinSoundId): string {
  return pinyinSoundNameSetting.marshalKey({ soundId });
}

export function pinyinSoundGroupNameSettingKey(
  soundGroupId: PinyinSoundGroupId,
): string {
  return pinyinSoundGroupNameSetting.marshalKey({ soundGroupId });
}

export function pinyinSoundGroupThemeSettingKey(
  soundGroupId: PinyinSoundGroupId,
): string {
  return pinyinSoundGroupThemeSetting.marshalKey({ soundGroupId });
}

//
// Hanzi hint settings
//

export const hanziWordMeaningHintTextSetting = r.entity(
  `hanziWordMeaningHint.[hanziWord].hint`,
  {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  },
);

export const hanziWordMeaningHintExplanationSetting = r.entity(
  `hanziWordMeaningHint.[hanziWord].explanation`,
  {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  },
);

export const hanziWordMeaningHintImageSetting = r.entity(
  `hanziWordMeaningHint.[hanziWord].selectedHintImageId`,
  {
    hanziWord: rHanziWord().alias(`h`),
    imageId: r.string().alias(`t`),
  },
);

export const hanziPronunciationHintTextSetting = r.entity(
  `hanziPronunciationHint.[hanzi].[pinyin].hint`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
);

export const hanziPronunciationHintExplanationSetting = r.entity(
  `hanziPronunciationHint.[hanzi].[pinyin].explanation`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
);

export const hanziPronunciationHintImageSetting = r.entity(
  `hanziPronunciationHint.[hanzi].[pinyin].selectedHintImageId`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    imageId: r.string().alias(`t`),
  },
);

export function getHanziPronunciationHintKeyParams(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
) {
  return {
    hanzi,
    pinyin: normalizePinyinUnitForHintKey(pinyinUnit),
  };
}

export interface HanziWordHintOverrides {
  hint?: string;
  explanation?: string;
  imageId?: string;
  hasOverrides: boolean;
}

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

  const hint = hintSetting.value?.text ?? undefined;
  const explanation = explanationSetting.value?.text ?? undefined;
  const imageId = imageSetting.value?.imageId ?? undefined;
  const hasOverrides = hint != null || explanation != null || imageId != null;

  return { hint, explanation, imageId, hasOverrides };
}

export function useSelectedHint(hanziWord: HanziWord): string | undefined {
  return useHanziWordHintOverrides(hanziWord).hint;
}
