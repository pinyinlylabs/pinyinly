import { parseImageCrop } from "@/client/ui/imageCrop";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/client/userSettings";
import type { HanziWord } from "@/data/model";
import { nanoid } from "@/util/nanoid";
import type {
  RizzleAnyEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
  RizzleType,
} from "@/util/rizzle";
import { keyPathVariableNames } from "@/util/rizzle";
import type { Flatten } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./useDb";
import { useRizzle } from "./useRizzle";

export {
  autoCheckUserSetting,
  getHanziPronunciationHintKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupNameSettingKey,
  pinyinSoundGroupThemeSetting,
  pinyinSoundGroupThemeSettingKey,
  pinyinSoundNameSetting,
  pinyinSoundNameSettingKey,
  x,
  type UserSettingImageEntity,
  type UserSettingTextEntity,
  type UserSettingToggleableEntity,
} from "@/client/userSettings";

export type UserSettingEntity = RizzleAnyEntity;
export type UserSettingKeyInput<T extends UserSettingEntity> = Parameters<
  T[`marshalKey`]
>[0];
export type UserSettingEntityInput<T extends UserSettingEntity> =
  Flatten<RizzleEntityInput<T> | null>;
export type UserSettingEntityOutput<T extends UserSettingEntity> =
  RizzleEntityOutput<T> | null;

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
  const db = useDb();
  const r = useRizzle();

  const result = useLiveQuery(
    (q) =>
      q
        .from({ setting: db.settingCollection })
        .where(({ setting }) => eq(setting.key, settingKey)),
    [db.settingCollection, settingKey],
  );

  const isLoading = result.isLoading;
  const settingData = result.data[0] ?? null;
  const value =
    settingData?.value == null
      ? null
      : userSettingEntity.unmarshalValue({
          ...keyParamMarshaled,
          ...settingData.value,
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
  const db = useDb();

  const result = useLiveQuery(
    (q) =>
      q
        .from({ settingHistory: db.settingHistoryCollection })
        .where(({ settingHistory }) => eq(settingHistory.key, settingKey)),
    [db.settingHistoryCollection, settingKey],
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
              ...entry.value,
            }),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { isLoading: result.isLoading, entries };
}

export interface HanziWordHintOverrides {
  hint?: string;
  explanation?: string;
  imageId?: string;
  imageCrop?: ReturnType<typeof parseImageCrop>;
  imageWidth?: number;
  imageHeight?: number;
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
  const imageCrop = parseImageCrop(imageSetting.value?.imageCrop);
  const imageWidthRaw = imageSetting.value?.imageWidth as unknown;
  const imageHeightRaw = imageSetting.value?.imageHeight as unknown;
  const imageWidth =
    typeof imageWidthRaw === `number` ? imageWidthRaw : undefined;
  const imageHeight =
    typeof imageHeightRaw === `number` ? imageHeightRaw : undefined;
  const hasOverrides =
    hint != null ||
    explanation != null ||
    imageId != null ||
    imageCrop.kind === `rect`;

  return {
    hint,
    explanation,
    imageId,
    imageCrop,
    imageWidth,
    imageHeight,
    hasOverrides,
  };
}

export function useSelectedHint(hanziWord: HanziWord): string | undefined {
  return useHanziWordHintOverrides(hanziWord).hint;
}
