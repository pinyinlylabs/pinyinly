import type {
  ActorId,
  ActorSpec,
  AssetId,
  HanziText,
  LocationId,
  LocationSetKey,
  PinyinSoundId,
  LocationSpec,
  PinyinText,
  PronunciationMnemonicSpec,
  Skill,
  SrsStateType,
  PinyinUnit,
} from "@/data/model";
import {
  actorIdSchema,
  actorSpecSchema,
  locationIdSchema,
  locationSetKeySchema,
  locationSpecSchema,
  pronunciationMnemonicSpecSchema,
  SrsKind,
} from "@/data/model";
import {
  actorModelSheetImageSetting,
  actorSpecJsonSetting,
  getEffectiveToneSetKeyForSoundId,
  locationSetIdentityImageSetting,
  locationSpecJsonSetting,
  pinyinSoundActorSetting,
  pinyinSoundLocationSetKeySetting,
  pinyinSoundLocationSetting,
  pronunciationMnemonicSpecSetting,
  userNameTextSetting,
} from "@/data/userSettings";
import * as schema from "@/server/pgSchema";
import type { FsrsState } from "@/util/fsrs";
import { nextReview } from "@/util/fsrs";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Drizzle } from "./db";
import { getUserSetting, setUserSetting } from "./userSettings";
import {
  normalizePinyinUnitForHintKey,
  splitPinyinUnitOrThrow,
} from "@/data/pinyin";

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
  const decoded = await getUserSetting(db, userId, userNameTextSetting, {});
  return decoded?.text ?? null;
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

export async function getPronunciationMnemonicSpec(
  db: Drizzle,
  userId: string,
  hanzi: HanziText,
  pinyin: PinyinText,
): Promise<PronunciationMnemonicSpec | null> {
  const decoded = await getUserSetting(
    db,
    userId,
    pronunciationMnemonicSpecSetting,
    { hanzi, pinyin },
  );

  if (decoded == null) {
    return null;
  }

  return pronunciationMnemonicSpecSchema.parse(decoded.value, {
    reportInput: true,
  });
}

export async function getLocationSpec(
  db: Drizzle,
  userId: string,
  locationId: LocationId,
): Promise<LocationSpec | null> {
  const decoded = await getUserSetting(db, userId, locationSpecJsonSetting, {
    locationId: locationId,
  });

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
  const decoded = await getUserSetting(db, userId, actorSpecJsonSetting, {
    actorId,
  });

  return actorSpecSchema.parse(decoded?.value, {
    reportInput: true,
  });
}

export async function getActorModelSheetImage(
  db: Drizzle,
  userId: string,
  actorId: ActorId,
): Promise<AssetId | null> {
  const decoded = await getUserSetting(
    db,
    userId,
    actorModelSheetImageSetting,
    { actorId },
  );

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
  const decoded = await getUserSetting(
    db,
    userId,
    locationSetIdentityImageSetting,
    { locationId, setKey },
  );

  return decoded?.imageId ?? null;
}

export async function getMnemonicAssociationsForPinyin(
  db: Drizzle,
  userId: string,
  pinyin: PinyinUnit,
): Promise<{
  actorId: ActorId;
  locationId: LocationId;
  locationSetKey: LocationSetKey;
}> {
  const splitPinyin = splitPinyinUnitOrThrow(pinyin);

  const actorResult = await getUserSetting(
    db,
    userId,
    pinyinSoundActorSetting,
    { soundId: splitPinyin.initialSoundId },
  );

  const locationResult = await getUserSetting(
    db,
    userId,
    pinyinSoundLocationSetting,
    { soundId: splitPinyin.finalSoundId },
  );

  const setKeyResult = await getUserSetting(
    db,
    userId,
    pinyinSoundLocationSetKeySetting,
    { soundId: splitPinyin.toneSoundId },
  );

  const actorId = actorIdSchema.parse(actorResult?.actorId, {
    reportInput: true,
  });
  const locationId = locationIdSchema.parse(locationResult?.locationId, {
    reportInput: true,
  });
  const locationSetKey = locationSetKeySchema.parse(setKeyResult?.setKey, {
    reportInput: true,
  });

  return { actorId, locationId, locationSetKey };
}

export async function getPinyinToneLocationSetKey(
  db: Drizzle,
  userId: string,
  pinyin: PinyinUnit,
): Promise<LocationSetKey | null> {
  const pinyinUnit = normalizePinyinUnitForHintKey(pinyin);
  const splitPinyin = splitPinyinUnitOrThrow(pinyinUnit);

  return getToneLocationSetKey(db, userId, splitPinyin.toneSoundId);
}

export async function getToneLocationSetKey(
  db: Drizzle,
  userId: string,
  soundId: PinyinSoundId,
): Promise<LocationSetKey | null> {
  const decoded = await getUserSetting(
    db,
    userId,
    pinyinSoundLocationSetKeySetting,
    {
      soundId,
    },
  );

  return getEffectiveToneSetKeyForSoundId(soundId, decoded?.setKey);
}
