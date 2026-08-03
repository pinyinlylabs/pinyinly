import type {
  ActorId,
  ActorSpec,
  AssetId,
  HanziText,
  LocationId,
  LocationSetKey,
  LocationSpec,
  PinyinText,
  PronunciationHintMnemonicSpec,
  Skill,
  SrsStateType,
} from "@/data/model";
import {
  actorSpecSchema,
  locationSpecSchema,
  pronunciationHintMnemonicSpecSchema,
  SrsKind,
} from "@/data/model";
import {
  actorModelSheetImageSetting,
  actorSpecJsonSetting,
  locationSetIdentityImageSetting,
  locationSpecJsonSetting,
  pronunciationHintMnemonicSpecSetting,
  userNameTextSetting,
} from "@/data/userSettings";
import * as schema from "@/server/pgSchema";
import type { FsrsState } from "@/util/fsrs";
import { nextReview } from "@/util/fsrs";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Drizzle } from "./db";
import { setUserSetting } from "./userSettings";

export async function updateSkillState(
  tx: Drizzle,
  skill: Skill,
  userId: string,
) {
  // WARNING: very inefficient, but stable. Reading all historical ratings just
  // to compute the new one should be skipped and instead just the latest
  // `skillState` should be used as the starting point.

  // Read all historical skill ratings (excluding trashed ones).
  const skillRatings = await tx.query.skillRating.findMany({
    where: and(
      eq(schema.skillRating.skill, skill),
      eq(schema.skillRating.userId, userId),
      isNull(schema.skillRating.trashedAt),
    ),
    orderBy: [asc(schema.skillRating.createdAt)],
  });

  // Starting from the null state, apply each skill rating.
  let fsrsState: FsrsState | null = null;
  for (const { rating, createdAt } of skillRatings) {
    fsrsState = nextReview(fsrsState, rating, createdAt);
  }

  if (fsrsState === null) {
    // No ratings remain (all were undone), delete the skill state
    await tx
      .delete(schema.skillState)
      .where(
        and(
          eq(schema.skillState.userId, userId),
          eq(schema.skillState.skill, skill),
        ),
      );
    return;
  }

  // Save the new state.
  {
    const srs = {
      kind: SrsKind.FsrsFourPointFive,
      ...fsrsState,
    } satisfies SrsStateType;

    await tx
      .insert(schema.skillState)
      .values([{ userId, skill, srs }])
      .onConflictDoUpdate({
        target: [schema.skillState.userId, schema.skillState.skill],
        set: { srs },
      });
  }
}

/**
 * Fetch the user name (userNameSetting) for a user.
 * Returns null if no setting exists.
 */
export async function getUserName(
  db: Drizzle,
  userId: string,
): Promise<string | null> {
  const key = {};
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(schema.userSetting.key, userNameTextSetting.entity.marshalKey(key)),
    ),
  });

  if (setting?.value) {
    const decoded = userNameTextSetting.decode(key, setting.value);
    return decoded?.text ?? null;
  }
  return null;
}

/**
 * Set the user name (userNameSetting) for a user.
 * Creates or updates the setting.
 */
export async function setUserName(
  db: Drizzle,
  userId: string,
  userName: string,
): Promise<void> {
  await setUserSetting(db, userId, {
    key: userNameTextSetting.entity.marshalKey({}),
    value: userNameTextSetting.entity.marshalValue({
      text: userName,
    }),
    now: new Date(),
    skipHistory: false,
  });

  const marshaledValue = userNameTextSetting.entity.marshalValue({
    text: userName,
  });
  await db
    .insert(schema.userSetting)
    .values({
      userId,
      key: userNameTextSetting.entity.marshalKey({}),
      value: marshaledValue,
    })
    .onConflictDoUpdate({
      target: [schema.userSetting.userId, schema.userSetting.key],
      set: { value: marshaledValue },
    });
}

export async function getPronunciationHintMnemonicSpec(
  db: Drizzle,
  userId: string,
  hanzi: HanziText,
  pinyin: PinyinText,
): Promise<PronunciationHintMnemonicSpec | null> {
  const key = { hanzi, pinyin };

  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        pronunciationHintMnemonicSpecSetting.entity.marshalKey(key),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = pronunciationHintMnemonicSpecSetting.decode(
    key,
    setting.value,
  );

  if (decoded == null) {
    return null;
  }

  return pronunciationHintMnemonicSpecSchema.parse(decoded.value, {
    reportInput: true,
  });
}

export async function getLocationSpec(
  db: Drizzle,
  userId: string,
  locationId: LocationId,
): Promise<LocationSpec | null> {
  const key = {
    locationId: locationId,
  };
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        locationSpecJsonSetting.entity.marshalKey(key),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = locationSpecJsonSetting.decode(key, setting.value);

  if (decoded == null) {
    return null;
  }

  return locationSpecSchema.parse(decoded.value, {
    reportInput: true,
  });
}

export async function getActorSpec(
  db: Drizzle,
  userId: string,
  actorId: ActorId,
): Promise<ActorSpec | null> {
  const key = { actorId };
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(schema.userSetting.key, actorSpecJsonSetting.entity.marshalKey(key)),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = actorSpecJsonSetting.decode(key, setting.value);

  return actorSpecSchema.parse(decoded?.value, {
    reportInput: true,
  });
}

export async function getActorModelSheetImage(
  db: Drizzle,
  userId: string,
  actorId: ActorId,
): Promise<AssetId | null> {
  const key = { actorId };

  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        actorModelSheetImageSetting.entity.marshalKey(key),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = actorModelSheetImageSetting.decode(key, setting.value);

  return decoded?.imageId ?? null;
}

export async function setLocationSetIdentityImage(
  db: Drizzle,
  userId: string,
  locationId: LocationId,
  setKey: LocationSetKey,
  imageId: AssetId,
): Promise<void> {
  await setUserSetting(db, userId, {
    key: locationSetIdentityImageSetting.entity.marshalKey({
      locationId,
      setKey,
    }),
    value: locationSetIdentityImageSetting.entity.marshalValue({
      locationId: locationId,
      setKey,
      imageId: imageId,
    }),
  });
}

export async function getLocationSetIdentityImage(
  db: Drizzle,
  userId: string,
  locationId: LocationId,
  setKey: LocationSetKey,
): Promise<AssetId | null> {
  const key = {
    locationId,
    setKey,
  };
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        locationSetIdentityImageSetting.entity.marshalKey(key),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = locationSetIdentityImageSetting.decode(key, setting.value);

  return decoded?.imageId ?? null;
}
