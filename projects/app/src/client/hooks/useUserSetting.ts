import type {
  RizzleAnyEntity,
  RizzleBoolean,
  RizzleEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
  RizzleType,
  RizzleTypeAlias,
} from "@/util/rizzle";
import { keyPathVariableNames, r } from "@/util/rizzle";
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

export interface UseUserSettingResult<T extends UserSettingEntity> {
  isLoading: boolean;
  value: UserSettingEntityOutput<T>;
  setValue: UseUserSettingSetValue<T>;
}

export type UseUserSettingUpdateFn<T extends UserSettingEntity> = (
  prev: UserSettingEntityOutput<T>,
  isLoading: boolean,
) => UserSettingEntityInput<T>;

export type UseUserSettingSetValue<T extends UserSettingEntity> = (
  value: UserSettingEntityInput<T> | UseUserSettingUpdateFn<T>,
) => void;

const noKeyParams = {} as const; // allow memoization inside rizzle
export const useUserSetting = <T extends UserSettingEntity>(
  userSettingEntity: T,
  keyParams?: UserSettingKeyInput<T>,
): UseUserSettingResult<T> => {
  const keyInput = (keyParams ?? noKeyParams) as UserSettingKeyInput<T>;
  const settingKey = userSettingEntity.marshalKey(keyInput);
  const r = useReplicache();

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
    const rawValue = (keyInput as Record<string, unknown>)[name];
    if (rawValue == null) {
      continue;
    }
    keyParamMarshaled[alias] = type.marshal(rawValue) as string;
  }

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

  const setValue: UseUserSettingSetValue<T> = (updater) => {
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

    void r.mutate
      .setSetting({
        key: settingKey,
        value: strippedValue ?? null,
        now: new Date(),
      })
      .catch((error: unknown) => {
        console.error(`Failed to set user setting "${settingKey}":`, error);
      });
  };

  return { isLoading, value, setValue };
};

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
