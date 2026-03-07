import type { UserSetting } from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import type {
  RizzleAnyEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
  RizzleType,
} from "@/util/rizzle";
import { keyPathVariableNames } from "@/util/rizzle";
import { invariant } from "@pinyinly/lib/invariant";
import type { Flatten } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useRef } from "react";
import { useDb } from "./useDb";
import { useRizzle } from "./useRizzle";

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

export type UseUserSettingWithKeyOptions<T extends UserSettingEntity> = {
  setting: UserSettingEntityLike<T>;
  key: UserSettingKeyInput<T>;
};

export type UseUserSettingNoKeyOptions<T extends UserSettingEntity> =
  keyof UserSettingKeyInput<T> extends never
    ? {
        setting: UserSettingEntityLike<T>;
      }
    : never;

// Allows any combination in a union context (for ternaries)
export type UseUserSettingOptions<T extends UserSettingEntity> =
  | null
  | UseUserSettingWithKeyOptions<T>
  | UseUserSettingNoKeyOptions<T>;

export function useUserSetting(options: null): null;
export function useUserSetting<T extends UserSettingEntity>(
  options: UseUserSettingWithKeyOptions<T>,
): UseUserSettingResult<T>;
export function useUserSetting<T extends UserSettingEntity>(
  options: UseUserSettingNoKeyOptions<T>,
): UseUserSettingResult<T>;
export function useUserSetting<T extends UserSettingEntity = RizzleAnyEntity>(
  options: UseUserSettingOptions<T>,
): UseUserSettingResult<T> | null;
export function useUserSetting<T extends UserSettingEntity>(
  options: UseUserSettingOptions<T>,
): UseUserSettingResult<T> | null {
  const skip = options == null;
  const keyInput =
    options == null
      ? (noKeyParams as UserSettingKeyInput<T>)
      : ((`key` in options
          ? options.key
          : noKeyParams) as UserSettingKeyInput<T>);
  const { settingKey, keyParamAliases, keyParamMarshaled } = skip
    ? skippedSettingKeyInfo
    : getSettingKeyInfo(options.setting, keyInput);

  const db = useDb();
  const r = useRizzle();

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
    options == null || settingData?.value == null
      ? null
      : options.setting.entity.unmarshalValueSafe({
          ...keyParamMarshaled,
          ...settingData.value,
        });

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const setValue: UseUserSettingSetValue<T> = (updater, opts) => {
    invariant(!skip, `setValue should not be called when skip is true`);

    if (typeof updater === `function`) {
      updater = updater(valueRef.current, isLoading);
    }

    const nextValue = updater ?? null;
    const marshaledValue =
      nextValue == null
        ? null
        : options.setting.entity.marshalValue({
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
    const skipHistory = opts?.skipHistory === true;

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
