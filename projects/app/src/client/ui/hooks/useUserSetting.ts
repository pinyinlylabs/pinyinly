import { parseImageCrop } from "@/client/ui/imageCrop";
import type { HanziWord } from "@/data/model";
import type { UserSetting } from "@/data/userSettings";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
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
  getPinyinFinalToneKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinSoundDescriptionSetting,
  pinyinSoundDescriptionSettingKey,
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupNameSettingKey,
  pinyinSoundGroupThemeSetting,
  pinyinSoundGroupThemeSettingKey,
  pinyinSoundImageSetting,
  pinyinSoundImageSettingKey,
  pinyinSoundNameSetting,
  pinyinSoundNameSettingKey,
  quickSearchPickSetting,
  type UserSetting,
  type UserSettingImageEntity,
  type UserSettingTextEntity,
  type UserSettingToggleableEntity,
} from "@/data/userSettings";

export type UserSettingEntity = RizzleAnyEntity;
export type UserSettingEntityLike<T extends UserSettingEntity> = UserSetting<T>;
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

export type UseUserSettingUpdateFn<T extends UserSettingEntity> = (
  prev: UserSettingEntityOutput<T>,
  isLoading: boolean,
) => UserSettingEntityInput<T>;

export type UseUserSettingSetValue<T extends UserSettingEntity> = (
  value: UserSettingEntityInput<T> | UseUserSettingUpdateFn<T>,
  options?: UserSettingSetOptions,
) => void;

export function getSettingKeyInfo<T extends UserSettingEntity>(
  userSetting: UserSetting<T>,
  keyParams: UserSettingKeyInput<T>,
) {
  const settingEntity = userSetting.entity;
  const settingKey = settingEntity.marshalKey(keyParams);
  const valueShape = (
    settingEntity._def.valueType as unknown as {
      _def: { shape: Record<string, RizzleType> };
    }
  )._def.shape;
  const keyParamNames = keyPathVariableNames(settingEntity._def.keyPath);
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

export const noKeyParams = {} as const; // allow memoization inside rizzle
const skippedSettingKeyInfo = {
  settingKey: ``,
  keyParamAliases: [] as string[],
  keyParamMarshaled: {} as Record<string, string>,
};

export type UserSettingKeyParamsNoSkip<T extends UserSettingEntity> =
  UserSettingKeyInput<T> & { skip?: never };
export type UserSettingKeyParamsSkip<T extends UserSettingEntity> = {
  skip: true;
} & Partial<UserSettingKeyInput<T>>;

export function useUserSetting<T extends UserSettingEntity>(
  userSetting: UserSettingEntityLike<T>,
  keyParams: UserSettingKeyParamsNoSkip<T>,
): UseUserSettingResult<T>;
export function useUserSetting<T extends UserSettingEntity>(
  userSetting: UserSettingEntityLike<T>,
  keyParams: UserSettingKeyParamsSkip<T>,
): null;
export function useUserSetting<T extends UserSettingEntity>(
  userSetting: UserSettingEntityLike<T>,
): UseUserSettingResult<T>;
export function useUserSetting<T extends UserSettingEntity>(
  userSetting: UserSettingEntityLike<T>,
  keyParams: UserSettingKeyParamsNoSkip<T> | UserSettingKeyParamsSkip<T>,
): UseUserSettingResult<T> | null;
export function useUserSetting<T extends UserSettingEntity>(
  userSetting: UserSettingEntityLike<T>,
  keyParamsOrOptions?: UserSettingKeyInput<T> | UserSettingKeyParamsSkip<T>,
): UseUserSettingResult<T> | null {
  const hasOptions =
    keyParamsOrOptions != null &&
    typeof keyParamsOrOptions === `object` &&
    `skip` in keyParamsOrOptions;
  const options = hasOptions ? keyParamsOrOptions : undefined;
  const skip = options?.skip === true;

  const keyParams = skip ? null : keyParamsOrOptions;
  const db = useDb();
  const r = useRizzle();
  const settingEntity = userSetting.entity;

  const keyInput = (keyParams ?? noKeyParams) as UserSettingKeyInput<T>;
  const { settingKey, keyParamAliases, keyParamMarshaled } = skip
    ? skippedSettingKeyInfo
    : getSettingKeyInfo(userSetting, keyInput);

  const result = useLiveQuery(
    (q) =>
      skip
        ? null
        : q
            .from({ setting: db.settingCollection })
            .where(({ setting }) => eq(setting.key, settingKey)),
    [db.settingCollection, skip, settingKey],
  );

  const isLoading = result.isLoading;
  const settingData = result.data?.[0] ?? null;
  const value =
    settingData?.value == null
      ? null
      : settingEntity.unmarshalValueSafe({
          ...keyParamMarshaled,
          ...settingData.value,
        });

  const setValue: UseUserSettingSetValue<T> = (updater, options) => {
    if (skip) {
      return;
    }
    if (typeof updater === `function`) {
      updater = updater(value, isLoading);
    }

    const nextValue = updater ?? null;
    const marshaledValue =
      nextValue == null
        ? null
        : settingEntity.marshalValue({
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

  if (skip) {
    return null;
  }

  return { isLoading, value, setValue };
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
