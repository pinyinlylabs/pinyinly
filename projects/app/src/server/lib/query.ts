import type {
  AssetId,
  LocationSetKey,
  LocationId,
  LocationSpec,
  Skill,
  SrsStateType,
  ActorSpec,
  ActorId,
} from "@/data/model";
import { locationSpecSchema, SrsKind, actorSpecSchema } from "@/data/model";
import {
  actorMnemonicIdentitySetting,
  locationSetIdentityImageSetting,
  pinyinSoundLocationSpecSetting,
  userNameSetting,
} from "@/data/userSettings";
import * as schema from "@/server/pgSchema";
import type { FsrsState } from "@/util/fsrs";
import { nextReview } from "@/util/fsrs";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Drizzle } from "./db";
import { jsonCodec } from "@pinyinly/lib/zod";
import { setUserSetting } from "./userSettings";
import { nanoid } from "@/util/nanoid";

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
  const settingKey = userNameSetting.entity.marshalKey({});
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(schema.userSetting.key, settingKey),
    ),
  });

  if (setting?.value) {
    const decoded = userNameSetting.decode({}, setting.value);
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
  const settingKey = userNameSetting.entity.marshalKey({});
  const marshaledValue = userNameSetting.entity.marshalValue({
    text: userName,
  });
  await db
    .insert(schema.userSetting)
    .values({
      userId,
      key: settingKey,
      value: marshaledValue,
    })
    .onConflictDoUpdate({
      target: [schema.userSetting.userId, schema.userSetting.key],
      set: { value: marshaledValue },
    });
}

export async function getLocationSpec(
  db: Drizzle,
  userId: string,
  locationId: LocationId,
): Promise<LocationSpec | null> {
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        pinyinSoundLocationSpecSetting.entity.marshalKey({
          locationId: locationId,
        }),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = pinyinSoundLocationSpecSetting.decode(
    { locationId: locationId },
    setting.value,
  );

  if (decoded == null) {
    return null;
  }

  return jsonCodec(locationSpecSchema).parse(decoded.text, {
    reportInput: true,
  });
}

export async function getActorSpec(
  db: Drizzle,
  userId: string,
  actorId: ActorId,
): Promise<ActorSpec | null> {
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        actorMnemonicIdentitySetting.entity.marshalKey({ actorId }),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = actorMnemonicIdentitySetting.decode(
    { actorId },
    setting.value,
  );

  return actorSpecSchema.parse(decoded?.mnemonicIdentity, {
    reportInput: true,
  });
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
    now: new Date(),
    skipHistory: false,
    historyId: nanoid(),
  });
}

export async function getLocationSetIdentityImage(
  db: Drizzle,
  userId: string,
  locationId: LocationId,
  setKey: LocationSetKey,
): Promise<AssetId | null> {
  const setting = await db.query.userSetting.findFirst({
    where: and(
      eq(schema.userSetting.userId, userId),
      eq(
        schema.userSetting.key,
        locationSetIdentityImageSetting.entity.marshalKey({
          locationId,
          setKey,
        }),
      ),
    ),
  });

  if (setting == null) {
    return null;
  }

  const decoded = locationSetIdentityImageSetting.decode(
    { locationId, setKey },
    setting.value,
  );

  return decoded?.imageId ?? null;
}
