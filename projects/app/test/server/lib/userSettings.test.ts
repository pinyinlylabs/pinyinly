import { getUserSetting } from "#server/lib/userSettings.ts";
import * as s from "#server/pgSchema.ts";
import {
  aiImageStyleTextSetting,
  pinyinSoundLocationSetKeySetting,
  userNameTextSetting,
} from "#data/userSettings.ts";
import type { PinyinSoundId } from "#data/model.ts";
import { describe, expect } from "vitest";
import { dbTest } from "./dbHelpers.ts";

describe(`getUserSetting`, () => {
  dbTest(`returns the stored value when the row exists`, async ({ db }) => {
    const userId = `user-1`;
    await db.insert(s.user).values({ id: userId });
    await db.insert(s.userSetting).values({
      userId,
      key: userNameTextSetting.entity.marshalKey({}),
      value: userNameTextSetting.encodeStoredValue({}, { text: `alice` }),
    });

    const result = await getUserSetting(db, userId, userNameTextSetting, {});

    expect(result).toEqual({ text: `alice` });
  });

  dbTest(
    `falls back to the setting default when the row is missing`,
    async ({ db }) => {
      const userId = `user-2`;
      await db.insert(s.user).values({ id: userId });

      const result = await getUserSetting(
        db,
        userId,
        aiImageStyleTextSetting,
        {},
      );

      expect(result).toEqual({ text: `comic` });
    },
  );

  dbTest(`returns null when there is no row and no default`, async ({ db }) => {
    const userId = `user-3`;
    await db.insert(s.user).values({ id: userId });

    const result = await getUserSetting(
      db,
      userId,
      pinyinSoundLocationSetKeySetting,
      {
        soundId: `nonTone` as PinyinSoundId,
      },
    );

    expect(result).toBeNull();
  });
});
