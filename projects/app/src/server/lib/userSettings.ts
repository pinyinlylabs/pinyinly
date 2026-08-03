import {
  getUserSettingDefaultValue,
  getUserSettingHistoryLimitFromKey,
} from "@/data/userSettings";
import type { UserSetting, UserSettingKeyInput } from "@/data/userSettings";
import * as schema from "@/server/pgSchema";
import type { Drizzle } from "./db";
import { sortComparatorDate } from "@pinyinly/lib/collections";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "@/util/nanoid";
import type {
  RizzleAnyEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
} from "@/util/rizzle";

type UserSettingValue = (typeof schema.userSetting.$inferInsert)[`value`];

type UserSettingReadDb = Pick<Drizzle, `query`>;

export async function getUserSetting<T extends RizzleAnyEntity>(
  db: UserSettingReadDb,
  userId: string,
  userSetting: UserSetting<T>,
  keyParams: UserSettingKeyInput<T>,
): Promise<RizzleEntityOutput<T> | null> {
  const settingKey = userSetting.entity.marshalKey(keyParams);
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(schema.userSetting.key, settingKey),
    ),
  });

  const storedValue =
    setting?.value ?? getUserSettingDefaultValue(userSetting, keyParams);

  if (storedValue == null) {
    return null;
  }

  if (setting == null) {
    return userSetting.decode(
      keyParams,
      userSetting.entity.marshalValue({
        ...(keyParams as Record<string, unknown>),
        ...storedValue,
      } as RizzleEntityInput<T>),
    );
  }

  return userSetting.decode(keyParams, storedValue);
}

export async function setUserSetting(
  db: Drizzle,
  userId: string,
  {
    key,
    value,
    now,
    skipHistory,
    historyId,
  }: {
    key: string;
    value: UserSettingValue;
    now?: Date;
    skipHistory?: boolean;
    historyId?: string;
  },
): Promise<void> {
  now ??= new Date();

  const updatedAt = now;
  const createdAt = now;

  await db
    .insert(schema.userSetting)
    .values([{ userId, key, value, updatedAt, createdAt }])
    .onConflictDoUpdate({
      target: [schema.userSetting.userId, schema.userSetting.key],
      set: { value, updatedAt },
    });

  if (skipHistory === true) {
    return;
  }

  historyId ??= nanoid();

  await db.insert(schema.userSettingHistory).values([
    {
      id: historyId,
      userId,
      key,
      value,
      createdAt: now,
    },
  ]);

  const historyLimit = getUserSettingHistoryLimitFromKey(key);

  const entries = await db.query.userSettingHistory.findMany({
    where: and(
      eq(schema.userSettingHistory.userId, userId),
      eq(schema.userSettingHistory.key, key),
    ),
    columns: {
      id: true,
      createdAt: true,
    },
  });

  const staleEntryIds = entries
    .sort(sortComparatorDate((entry: { createdAt: Date }) => entry.createdAt))
    .slice(0, Math.max(0, entries.length - historyLimit))
    .map((entry: { id: string }) => entry.id);

  if (staleEntryIds.length > 0) {
    await db
      .delete(schema.userSettingHistory)
      .where(
        and(
          eq(schema.userSettingHistory.userId, userId),
          inArray(schema.userSettingHistory.id, staleEntryIds),
        ),
      );
  }
}
