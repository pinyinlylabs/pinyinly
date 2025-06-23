import type {
  RizzleAnyEntity,
  RizzleBoolean,
  RizzleEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
  RizzleTypeAlias,
} from "@/util/rizzle";
import { r } from "@/util/rizzle";
import type { Flatten } from "@/util/types";
import { useReplicache } from "./useReplicache";
import { useRizzleQuery } from "./useRizzleQuery";

export type UserSettingEntity = RizzleAnyEntity;
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
): UseUserSettingResult<T> => {
  const settingKey = userSettingEntity.marshalKey(noKeyParams);
  const r = useReplicache();

  const result = useRizzleQuery([`UserSetting`, settingKey], async (r, tx) => {
    const value = await r.query.setting.get(tx, { key: settingKey });
    return value ?? null;
  });

  const isLoading = result.isPending;
  const value =
    result.data?.value == null
      ? null
      : userSettingEntity.unmarshalValue(result.data.value);

  const setValue: UseUserSettingSetValue<T> = (updater) => {
    if (typeof updater === `function`) {
      updater = updater(value, isLoading);
    }

    void r.mutate
      .setSetting({
        key: settingKey,
        value: updater == null ? null : userSettingEntity.marshalValue(updater),
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
