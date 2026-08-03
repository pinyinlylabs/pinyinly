import { getUserSettingHistoryLimitFromKey } from "@/data/userSettings";
import * as schema from "@/server/pgSchema";
import { sortComparatorDate } from "@pinyinly/lib/collections";
import { and, eq, inArray } from "drizzle-orm";
import type { Drizzle } from "./db";
import { nanoid } from "@/util/nanoid";

type UserSettingValue = (typeof schema.userSetting.$inferInsert)[`value`];

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
    .sort(sortComparatorDate((entry) => entry.createdAt))
    .slice(0, Math.max(0, entries.length - historyLimit))
    .map((entry) => entry.id);

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
