import { userSettingEntity } from "@/data/userSettings";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./useDb";
import type {
  UserSettingEntity,
  UserSettingEntityLike,
  UserSettingEntityOutput,
  UserSettingKeyInput,
} from "./useUserSetting";
import { getSettingKeyInfo, noKeyParams } from "./useUserSetting";

export interface UserSettingHistoryEntry<T extends UserSettingEntity> {
  id: string;
  createdAt: Date;
  value: UserSettingEntityOutput<T>;
}

export function useUserSettingHistory<T extends UserSettingEntity>(
  userSetting: UserSettingEntityLike<T>,
  keyParams?: UserSettingKeyInput<T>,
): {
  isLoading: boolean;
  entries: UserSettingHistoryEntry<T>[];
} {
  const settingEntity = userSettingEntity(userSetting);
  const keyInput = (keyParams ?? noKeyParams) as UserSettingKeyInput<T>;
  const { settingKey, keyParamMarshaled } = getSettingKeyInfo(
    settingEntity,
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
          : settingEntity.unmarshalValueSafe({
              ...keyParamMarshaled,
              ...entry.value,
            }),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { isLoading: result.isLoading, entries };
}
