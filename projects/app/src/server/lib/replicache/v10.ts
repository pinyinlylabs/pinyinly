import {
  nextReviewForOtherSkillMistake,
  skillsToReReviewForHanziGlossMistake,
  skillsToReReviewForHanziPinyinMistake,
} from "@/data/mistakes";
import type {
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
  HanziWord,
  PinyinSoundGroupId,
  PinyinSoundId,
  Skill,
} from "@/data/model";
import { AssetStatusKind, MistakeKind } from "@/data/model";
import { v10 as schema } from "@/data/rizzleSchema";
import type { Drizzle, Xmin } from "@/server/lib/db";
import {
  assertMinimumIsolationLevel,
  json_agg,
  json_build_object,
  pgBatchUpdate,
  pgXmin,
  withRepeatableReadTransaction,
} from "@/server/lib/db";
import { updateSkillState } from "@/server/lib/queries";
import type { CvrEntities } from "@/server/pgSchema";
import * as s from "@/server/pgSchema";
import type {
  ClientStateNotFoundResponse,
  Cookie,
  PullOkResponse,
  PullRequest,
  PushRequest,
  PushResponse,
  ReplicacheMutation,
  RizzleDrizzleMutators,
  RizzleEntity,
  RizzleRawObject,
  VersionNotSupportedResponse,
} from "@/util/rizzle";
import {
  makeDrizzleMutationHandler,
  replicacheMutationSchema,
} from "@/util/rizzle";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import { startSpan } from "@sentry/core";
import makeDebug from "debug";
import type { SQL } from "drizzle-orm";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { SubqueryWithSelection } from "drizzle-orm/pg-core";
import pickBy from "lodash/pickBy";

const loggerName = import.meta.filename.split(`/`).at(-1);
invariant(loggerName != null);
const debug = makeDebug(loggerName);

export const mutators: RizzleDrizzleMutators<typeof schema, Drizzle> = {
  async rateSkill(
    db,
    userId,
    { id, skill, rating, durationMs, now, reviewId },
  ) {
    await db
      .insert(s.skillRating)
      .values([
        { id, userId, skill, rating, durationMs, createdAt: now, reviewId },
      ]);

    await updateSkillState(db, skill, userId);
  },
  async saveHanziGlossMistake(
    db,
    userId,
    { id, gloss, hanziOrHanziWord, now, reviewId },
  ) {
    await db
      .insert(s.hanziGlossMistake)
      .values([
        { id, userId, gloss, hanziOrHanziWord, createdAt: now, reviewId },
      ]);

    // Apply mistake effect to in-scope skills.
    const mistake: HanziGlossMistakeType = {
      kind: MistakeKind.HanziGloss,
      gloss,
      hanziOrHanziWord,
    };
    const skillsToReview = await skillsToReReviewForHanziGlossMistake(mistake);

    // Find any existing skills for the user that should be reviewed again.
    const skillStates = await db.query.skillState.findMany({
      where: (t) =>
        and(eq(t.userId, userId), inArray(t.skill, [...skillsToReview])),
    });

    await pgBatchUpdate(db, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: skillStates.map((skillState) => [
        skillState.id,
        nextReviewForOtherSkillMistake(skillState.srs, now),
      ]),
    });
  },
  async saveHanziPinyinMistake(
    db,
    userId,
    { id, pinyin, hanziOrHanziWord, now, reviewId },
  ) {
    await db
      .insert(s.hanziPinyinMistake)
      .values([
        { id, userId, pinyin, hanziOrHanziWord, createdAt: now, reviewId },
      ]);

    // Apply mistake effect to in-scope skills.
    const mistake: HanziPinyinMistakeType = {
      kind: MistakeKind.HanziPinyin,
      pinyin,
      hanziOrHanziWord,
    };
    const skillsToReview = await skillsToReReviewForHanziPinyinMistake(mistake);

    // Find any existing skills for the user that should be reviewed again.
    const skillStates = await db.query.skillState.findMany({
      where: (t) =>
        and(eq(t.userId, userId), inArray(t.skill, [...skillsToReview])),
    });

    await pgBatchUpdate(db, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: skillStates.map((skillState) => [
        skillState.id,
        nextReviewForOtherSkillMistake(skillState.srs, now),
      ]),
    });
  },
  async setPinyinSoundName(db, userId, { soundId, name, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.pinyinSound)
      .values([{ userId, soundId, name, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [s.pinyinSound.userId, s.pinyinSound.soundId],
        set: { name, updatedAt },
      });
  },
  async setPinyinSoundGroupName(db, userId, { soundGroupId, name, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.pinyinSoundGroup)
      .values([{ userId, soundGroupId, name, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [s.pinyinSound.userId, s.pinyinSound.soundId],
        set: { name, updatedAt },
      });
  },
  async setPinyinSoundGroupTheme(db, userId, { soundGroupId, theme, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.pinyinSoundGroup)
      .values([{ userId, soundGroupId, theme, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [s.pinyinSound.userId, s.pinyinSound.soundId],
        set: { theme, updatedAt },
      });
  },
  async setSetting(db, userId, { key, value, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.userSetting)
      .values([{ userId, key, value, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [s.userSetting.userId, s.userSetting.key],
        set: { value, updatedAt },
      });
  },
  async undoReview(db, userId, { reviewId, now }) {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Find all skill ratings with this reviewId
    const skillRatings = await db.query.skillRating.findMany({
      where: and(
        eq(s.skillRating.userId, userId),
        eq(s.skillRating.reviewId, reviewId),
      ),
    });

    // Check if any rating is too old (beyond 1-day undo window)
    // If so, silently return without undoing
    for (const rating of skillRatings) {
      if (now.getTime() - rating.createdAt.getTime() > ONE_DAY_MS) {
        return;
      }
    }

    // Collect affected skills before marking as trashed
    const affectedSkills = new Set(
      skillRatings.filter((r) => r.trashedAt == null).map((r) => r.skill),
    );

    // Mark all skill ratings as trashed
    if (skillRatings.length > 0) {
      await db
        .update(s.skillRating)
        .set({ trashedAt: now })
        .where(
          and(
            eq(s.skillRating.userId, userId),
            eq(s.skillRating.reviewId, reviewId),
            isNull(s.skillRating.trashedAt),
          ),
        );
    }

    // Mark all gloss mistakes with this reviewId as trashed
    await db
      .update(s.hanziGlossMistake)
      .set({ trashedAt: now })
      .where(
        and(
          eq(s.hanziGlossMistake.userId, userId),
          eq(s.hanziGlossMistake.reviewId, reviewId),
          isNull(s.hanziGlossMistake.trashedAt),
        ),
      );

    // Mark all pinyin mistakes with this reviewId as trashed
    await db
      .update(s.hanziPinyinMistake)
      .set({ trashedAt: now })
      .where(
        and(
          eq(s.hanziPinyinMistake.userId, userId),
          eq(s.hanziPinyinMistake.reviewId, reviewId),
          isNull(s.hanziPinyinMistake.trashedAt),
        ),
      );

    // Recalculate SRS state for all affected skills
    for (const skill of affectedSkills) {
      await updateSkillState(db, skill, userId);
    }
  },
  async initAsset(db, userId, { assetId, contentType, contentLength, now }) {
    await db.insert(s.asset).values([
      {
        userId,
        assetId,
        status: AssetStatusKind.Pending,
        contentType,
        contentLength,
        createdAt: now,
      },
    ]);
  },
  async confirmAssetUpload(db, userId, { assetId, now }) {
    await db
      .update(s.asset)
      .set({
        status: AssetStatusKind.Uploaded,
        uploadedAt: now,
      })
      .where(and(eq(s.asset.userId, userId), eq(s.asset.assetId, assetId)));
  },
  async failAssetUpload(db, userId, { assetId, errorMessage }) {
    await db
      .update(s.asset)
      .set({
        status: AssetStatusKind.Failed,
        errorMessage,
      })
      .where(and(eq(s.asset.userId, userId), eq(s.asset.assetId, assetId)));
  },
  async createCustomHint(
    db,
    userId,
    {
      customHintId,
      hanziWord,
      hint,
      explanation,
      imageIds,
      primaryImageId,
      now,
    },
  ) {
    await db.insert(s.hanziwordMeaningHint).values({
      userId,
      customHintId,
      hanziWord,
      hint,
      explanation: explanation ?? null,
      imageIds:
        imageIds != null && imageIds.length > 0
          ? sql`${JSON.stringify(imageIds)}::jsonb`
          : null,
      primaryImageId:
        imageIds != null && imageIds.length > 0
          ? (primaryImageId ?? null)
          : null,
      createdAt: now,
      updatedAt: now,
    });
  },
  async updateCustomHint(
    db,
    userId,
    {
      customHintId,
      hanziWord: _hanziWord,
      hint,
      explanation,
      imageIds,
      primaryImageId,
      now,
    },
  ) {
    await db
      .update(s.hanziwordMeaningHint)
      .set({
        hint,
        explanation: explanation ?? null,
        imageIds:
          imageIds != null && imageIds.length > 0
            ? sql`${JSON.stringify(imageIds)}::jsonb`
            : null,
        primaryImageId:
          imageIds != null && imageIds.length > 0
            ? (primaryImageId ?? null)
            : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(s.hanziwordMeaningHint.userId, userId),
          eq(s.hanziwordMeaningHint.customHintId, customHintId),
        ),
      );
  },
  async deleteCustomHint(db, userId, { customHintId }) {
    await db
      .delete(s.hanziwordMeaningHint)
      .where(
        and(
          eq(s.hanziwordMeaningHint.userId, userId),
          eq(s.hanziwordMeaningHint.customHintId, customHintId),
        ),
      );
  },
  async setHanziwordMeaningHintSelected(
    db,
    userId,
    { hanziWord, selectedHintType, selectedHintId, selectedHintImageId, now },
  ) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.hanziwordMeaningHintSelected)
      .values({
        userId,
        hanziWord,
        selectedHintType,
        selectedHintId,
        selectedHintImageId: selectedHintImageId ?? null,
        updatedAt,
        createdAt,
      })
      .onConflictDoUpdate({
        target: [
          s.hanziwordMeaningHintSelected.userId,
          s.hanziwordMeaningHintSelected.hanziWord,
        ],
        set: {
          selectedHintType,
          selectedHintId,
          selectedHintImageId: selectedHintImageId ?? null,
          updatedAt,
        },
      });
  },
  async clearHanziwordMeaningHintSelected(db, userId, { hanziWord }) {
    await db
      .delete(s.hanziwordMeaningHintSelected)
      .where(
        and(
          eq(s.hanziwordMeaningHintSelected.userId, userId),
          eq(s.hanziwordMeaningHintSelected.hanziWord, hanziWord),
        ),
      );
  },
};

const mutate = makeDrizzleMutationHandler(schema, mutators);

export async function push(
  db: Drizzle,
  userId: string,
  pushRequest: PushRequest,
): Promise<PushResponse> {
  if (pushRequest.pushVersion !== 1) {
    return {
      error: `VersionNotSupported`,
      versionType: `push`,
    } satisfies VersionNotSupportedResponse;
  }

  // Required as per https://doc.replicache.dev/concepts/db-isolation-level
  await assertMinimumIsolationLevel(db, `repeatable read`);

  const mutationRecords: (typeof s.replicacheMutation.$inferInsert)[] = [];

  for (const mutation of pushRequest.mutations) {
    let success;
    let notSkipped;
    try {
      notSkipped = await processMutation(
        db,
        userId,
        pushRequest.clientGroupId,
        pushRequest.schemaVersion,
        mutation,
        false,
      );
      success = true;
    } catch {
      notSkipped = await processMutation(
        db,
        userId,
        pushRequest.clientGroupId,
        pushRequest.schemaVersion,
        mutation,
        true,
      );
      success = false;
    }

    // Save the mutations as a backup in case they need to be replayed later or
    // transferred to another database (e.g. local <-> production).
    //
    // This also needs to be done _last_ so that foreign keys to other tables
    // exist (e.g. client).
    if (notSkipped) {
      mutationRecords.push({
        clientId: mutation.clientId,
        mutationId: mutation.id,
        mutation,
        success,
        processedAt: new Date(),
      });
    }
  }

  if (mutationRecords.length > 0) {
    await db.insert(s.replicacheMutation).values(mutationRecords);
  }
}

export async function pull(
  db: Drizzle,
  userId: string,
  pullRequest: PullRequest,
): Promise<
  PullOkResponse | VersionNotSupportedResponse | ClientStateNotFoundResponse
> {
  // Required as per https://doc.replicache.dev/concepts/db-isolation-level
  await assertMinimumIsolationLevel(db, `repeatable read`);

  const { clientGroupId, cookie } = pullRequest;

  // 1: Fetch prevCVR
  const prevCvr =
    cookie == null
      ? null
      : await db.query.replicacheCvr.findFirst({
          where: (p, { eq }) => eq(p.id, cookie.cvrId),
        });

  // 2: Init baseCVR
  // n/a

  // 3: begin transaction
  const txResult = await withRepeatableReadTransaction(db, async (db) => {
    // 4-5: getClientGroup(body.clientGroupID), verify user
    const prevClientGroup = await getClientGroup(db, {
      userId,
      clientGroupId,
      schemaVersion: pullRequest.schemaVersion,
    });
    debug(`%o`, { prevClientGroup });

    // 6: Read all domain data, just ids and versions
    // n/a

    // 7: Read all clients in CG
    const clients = await db.query.replicacheClient.findMany({
      where: (t) => eq(t.clientGroupId, clientGroupId),
    });

    // 8: Build nextCVR
    const entitiesState = await computeEntitiesState(db, userId);

    const { patchOpsUnhydrated, nextCvrEntities, partial } = computePatch(
      prevCvr?.entities ?? {},
      entitiesState,
    );

    const nextCvrLastMutationIds = Object.fromEntries(
      clients.map((c) => [c.id, c.lastMutationId]),
    );
    debug(`%o`, { nextCvr: nextCvrEntities, nextCvrLastMutationIds });

    // 9: calculate diffs
    const lastMutationIdChanges = diffLastMutationIds(
      prevCvr?.lastMutationIds ?? {},
      nextCvrLastMutationIds,
    );
    debug(`%o`, {
      patchOpsUnhydrated,
      lastMutationIdsDiff: lastMutationIdChanges,
    });

    // 10: If diff is empty, return no-op PR
    if (
      prevCvr &&
      isEmptyPatch(patchOpsUnhydrated) &&
      isCvrLastMutationIdsDiffEmpty(lastMutationIdChanges)
    ) {
      return null;
    }

    // 11: get entities
    const patchOps = await hydratePatches(db, patchOpsUnhydrated);

    // 12: changed clients
    // n/a (done above)

    // 13: newCVRVersion
    const prevCvrVersion = pullRequest.cookie?.order ?? 0;
    const nextCvrVersion =
      Math.max(prevCvrVersion, prevClientGroup.cvrVersion) + 1;

    // 14: Write ClientGroupRecord
    const nextClientGroup = {
      ...prevClientGroup,
      cvrVersion: nextCvrVersion,
    };
    debug(`%o`, { nextClientGroup });
    await putClientGroup(db, nextClientGroup);

    const nextCvr: (typeof s.replicacheCvr)[`$inferInsert`] = {
      lastMutationIds: nextCvrLastMutationIds,
      entities: nextCvrEntities,
    };

    return {
      patchOps,
      nextCvr,
      lastMutationIdChanges,
      nextCvrVersion,
      partial,
    };
  });

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie: pullRequest.cookie,
      lastMutationIdChanges: {},
      patch: [],
      partial: false,
    };
  }

  const { patchOps, nextCvr, nextCvrVersion, lastMutationIdChanges, partial } =
    txResult;

  // 16-17: store cvr
  const [cvr] = await db
    .insert(s.replicacheCvr)
    .values([nextCvr])
    .returning({ id: s.replicacheCvr.id });
  invariant(cvr != null);

  // 18(i): build patch
  const patch: PullOkResponse[`patch`] = [];
  if (prevCvr == null) {
    patch.push({ op: `clear` });
  }

  // 18(i): dels
  // 18(ii): puts
  patch.push(...patchOps);

  // 18(ii): construct cookie
  const nextCookie: Cookie = {
    order: nextCvrVersion,
    cvrId: cvr.id,
  };

  // 17(iii): lastMutationIDChanges
  // n/a

  return {
    cookie: nextCookie,
    lastMutationIdChanges,
    patch,
    partial,
  };
}

type CvrNamespace =
  | `asset`
  | `customHint`
  | `hanziwordMeaningHintSelected`
  | `pinyinSound`
  | `pinyinSoundGroup`
  | `skillState`
  | `skillRating`
  | `hanziGlossMistake`
  | `hanziPinyinMistake`
  | `setting`;

interface SyncEntity<
  KeyPath extends string,
  S extends RizzleRawObject,
  R extends RizzleEntity<KeyPath, S>,
  DbEntityState extends SubqueryWithSelection<
    { map: SQL.Aliased<EntityState> },
    string
  >,
> {
  cvrNamespace: CvrNamespace;
  rizzleEntity: R;
  cvrKeyToEntityKey: (cvrKey: string) => string;
  fetchEntityPutOps: (
    db: Drizzle,
    ids: string[],
  ) => Promise<{ op: `put`; key: string; value: Record<string, string> }[]>;
  entityStateSubquery: (db: Drizzle, userId: string) => DbEntityState;
}

function makeSyncEntity<
  CvrKeyType extends string,
  KeyPath extends string,
  S extends RizzleRawObject,
  R extends RizzleEntity<KeyPath, S>,
  DbRow extends Parameters<R[`marshalKey`]>[0] &
    Parameters<R[`marshalValue`]>[0],
  DbEntityState extends SubqueryWithSelection<
    { map: SQL.Aliased<EntityState> },
    string
  >,
>(
  cvrNamespace: CvrNamespace,
  rizzleEntity: R,
  cvrKeyToEntityKey: (cvrKey: CvrKeyType, rizzleEntity: R) => string,
  fetchEntities: (db: Drizzle, ids: string[]) => Promise<DbRow[]>,
  entityStateSubquery: (db: Drizzle, userId: string) => DbEntityState,
): SyncEntity<KeyPath, S, R, DbEntityState> {
  return {
    cvrNamespace,
    rizzleEntity,
    cvrKeyToEntityKey: (cvrKey: string) =>
      cvrKeyToEntityKey(cvrKey as CvrKeyType, rizzleEntity),
    fetchEntityPutOps: async (db, ids) =>
      fetchEntities(db, ids).then((rows) =>
        rows.map((row) => ({
          op: `put`,
          key: rizzleEntity.marshalKey(row),
          value: rizzleEntity.marshalValue(row),
        })),
      ),
    entityStateSubquery,
  };
}

type PatchOpsUnhydrated = Partial<
  Record<CvrNamespace, { putIds: string[]; delKeys: string[] }>
>;

const parseCustomHintCvrKey = (key: string) => {
  const [hanziWord, customHintId] = key.split(`\t`);
  invariant(
    hanziWord != null && customHintId != null,
    `Invalid custom hint key`,
  );
  return { hanziWord: hanziWord as HanziWord, customHintId };
};

const syncEntities = [
  makeSyncEntity(
    `asset`,
    schema.asset,
    (assetId, e) => e.marshalKey({ assetId }),
    (db, ids) =>
      db.query.asset.findMany({
        where: (t) => inArray(t.id, ids),
      }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.asset.id,
              key: s.asset.assetId,
              xmin: pgXmin(s.asset),
            }),
          ).as(`assetVersions`),
        })
        .from(s.asset)
        .where(eq(s.asset.userId, userId))
        .as(`assetVersions`),
  ),
  makeSyncEntity(
    `customHint`,
    schema.customHint,
    (cvrKey, e) => {
      const { hanziWord, customHintId } = parseCustomHintCvrKey(cvrKey);
      return e.marshalKey({ hanziWord, customHintId });
    },
    (db, ids) =>
      db.query.hanziwordMeaningHint.findMany({
        where: (t) => inArray(t.id, ids),
      }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.hanziwordMeaningHint.id,
              key: sql<string>`concat_ws('\t', ${s.hanziwordMeaningHint.hanziWord}, ${s.hanziwordMeaningHint.customHintId})`,
              xmin: pgXmin(s.hanziwordMeaningHint),
            }),
          ).as(`customHintVersions`),
        })
        .from(s.hanziwordMeaningHint)
        .where(eq(s.hanziwordMeaningHint.userId, userId))
        .as(`customHintVersions`),
  ),
  makeSyncEntity(
    `hanziwordMeaningHintSelected`,
    schema.hanziwordMeaningHintSelected,
    (hanziWord, e) => e.marshalKey({ hanziWord: hanziWord as HanziWord }),
    (db, ids) =>
      db.query.hanziwordMeaningHintSelected.findMany({
        where: (t) => inArray(t.id, ids),
      }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.hanziwordMeaningHintSelected.id,
              key: s.hanziwordMeaningHintSelected.hanziWord,
              xmin: pgXmin(s.hanziwordMeaningHintSelected),
            }),
          ).as(`hanziwordMeaningHintSelectedVersions`),
        })
        .from(s.hanziwordMeaningHintSelected)
        .where(eq(s.hanziwordMeaningHintSelected.userId, userId))
        .as(`hanziwordMeaningHintSelectedVersions`),
  ),
  makeSyncEntity(
    `pinyinSound`,
    schema.pinyinSound,
    (key: PinyinSoundId, e) => e.marshalKey({ soundId: key }),
    (db, ids) =>
      db.query.pinyinSound.findMany({
        where: (t) => inArray(t.id, ids),
      }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.pinyinSound.id,
              key: s.pinyinSound.soundId,
              xmin: pgXmin(s.pinyinSound),
            }),
          ).as(`pinyinSoundVersions`),
        })
        .from(s.pinyinSound)
        .where(eq(s.pinyinSound.userId, userId))
        .as(`pinyinSoundVersions`),
  ),
  makeSyncEntity(
    `pinyinSoundGroup`,
    schema.pinyinSoundGroup,
    (key: PinyinSoundGroupId, e) => e.marshalKey({ soundGroupId: key }),
    (db, ids) =>
      db.query.pinyinSoundGroup.findMany({
        where: (t) => inArray(t.id, ids),
      }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.pinyinSoundGroup.id,
              key: s.pinyinSoundGroup.soundGroupId,
              xmin: pgXmin(s.pinyinSoundGroup),
            }),
          ).as(`pinyinSoundGroupVersions`),
        })
        .from(s.pinyinSoundGroup)
        .where(eq(s.pinyinSoundGroup.userId, userId))
        .as(`pinyinSoundGroupVersions`),
  ),
  makeSyncEntity(
    `skillState`,
    schema.skillState,
    (key: Skill, e) => e.marshalKey({ skill: key }),
    (db, ids) =>
      db.query.skillState.findMany({ where: (t) => inArray(t.id, ids) }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              key: s.skillState.skill,
              xmin: pgXmin(s.skillState),
              id: s.skillState.id,
            }),
          ).as(`skillStateVersions`),
        })
        .from(s.skillState)
        .where(eq(s.skillState.userId, userId))
        .as(`skillStateVersions`),
  ),
  makeSyncEntity(
    `skillRating`,
    schema.skillRating,
    (id, e) => e.marshalKey({ id }),
    (db, ids) =>
      db.query.skillRating.findMany({ where: (t) => inArray(t.id, ids) }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.skillRating.id,
              xmin: pgXmin(s.skillRating),
            }),
          ).as(`skillRatingVersions`),
        })
        .from(s.skillRating)
        .where(eq(s.skillRating.userId, userId))
        .as(`skillRatingVersions`),
  ),
  makeSyncEntity(
    `hanziGlossMistake`,
    schema.hanziGlossMistake,
    (id, e) => e.marshalKey({ id }),
    (db, ids) =>
      db.query.hanziGlossMistake.findMany({ where: (t) => inArray(t.id, ids) }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.hanziGlossMistake.id,
              xmin: pgXmin(s.hanziGlossMistake),
            }),
          ).as(`hanziGlossMistakeVersions`),
        })
        .from(s.hanziGlossMistake)
        .where(eq(s.hanziGlossMistake.userId, userId))
        .as(`hanziGlossMistakeVersions`),
  ),
  makeSyncEntity(
    `hanziPinyinMistake`,
    schema.hanziPinyinMistake,
    (id, e) => e.marshalKey({ id }),
    (db, ids) =>
      db.query.hanziPinyinMistake.findMany({
        where: (t) => inArray(t.id, ids),
      }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              id: s.hanziPinyinMistake.id,
              xmin: pgXmin(s.hanziPinyinMistake),
            }),
          ).as(`hanziPinyinMistakeVersions`),
        })
        .from(s.hanziPinyinMistake)
        .where(eq(s.hanziPinyinMistake.userId, userId))
        .as(`hanziPinyinMistakeVersions`),
  ),
  makeSyncEntity(
    `setting`,
    schema.setting,
    (key, e) => e.marshalKey({ key }),
    (db, ids) =>
      db.query.userSetting.findMany({ where: (t) => inArray(t.id, ids) }),
    (db, userId) =>
      db
        .select({
          map: json_agg(
            json_build_object({
              key: s.userSetting.key,
              xmin: pgXmin(s.userSetting),
              id: s.userSetting.id,
            }),
          ).as(`setting`),
        })
        .from(s.userSetting)
        .where(eq(s.userSetting.userId, userId))
        .as(`setting`),
  ),
];

export function computePatch(
  prevCvrEntities: CvrEntities,
  entitiesState: EntitiesState,
  opLimit = 10_000, // If this is too low, then loading the app will cause a huge number of CVR rows to be created just to load the app, and bloat the DB.
): {
  patchOpsUnhydrated: PatchOpsUnhydrated;
  nextCvrEntities: CvrEntities;
  partial: boolean;
} {
  const nextCvrEntities: CvrEntities = {};

  // Enforce a finite number of operations to avoid unbounded server work and
  // subsequent request timeouts.
  let opCount = 0;

  const patchOps: PatchOpsUnhydrated = {};

  for (const syncEntity of syncEntities) {
    const prevState = new Map(
      Object.entries(prevCvrEntities[syncEntity.cvrNamespace] ?? {}),
    );
    const patchPutsIds = [];
    const patchDelKeys = []; // replicache entity keys
    const nextCvrEntity: Record<string, Xmin> = {};
    for (const e of entitiesState[syncEntity.cvrNamespace]) {
      const cvrKey = e.key ?? e.id;
      const prevXmin = prevState.get(cvrKey);
      if (prevXmin === e.xmin) {
        nextCvrEntity[cvrKey] = prevXmin;
      } else {
        opCount++;
        if (opCount <= opLimit) {
          patchPutsIds.push(e.id);
          nextCvrEntity[cvrKey] = e.xmin;
        }
      }
      // Remove the key, so at the end we can calculate how many keys have been
      // deleted from the DB and need to have `del` patches sent to the client.
      prevState.delete(cvrKey);
    }

    // At this point all the entities that still exist in the DB have been
    // removed from prevState, so now prevState only has items that have been
    // deleted from the DB.

    for (const [orphanCvrKey, xmin] of prevState) {
      opCount++;
      if (opCount <= opLimit) {
        // If there's still budget, update the patch.
        patchDelKeys.push(syncEntity.cvrKeyToEntityKey(orphanCvrKey));
      } else {
        // If there's no budget to patch, copy across the old state.
        nextCvrEntity[orphanCvrKey] = xmin;
      }
    }

    nextCvrEntities[syncEntity.cvrNamespace] = nextCvrEntity;
    patchOps[syncEntity.cvrNamespace] = {
      putIds: patchPutsIds,
      delKeys: patchDelKeys,
    };
  }

  return {
    nextCvrEntities,
    patchOpsUnhydrated: patchOps,
    partial: opCount > opLimit,
  };
}

async function hydratePatches(
  db: Drizzle,
  entityPatchesUnhydrated: PatchOpsUnhydrated,
): Promise<PullOkResponse[`patch`]> {
  const pendingOps = [];

  for (const syncEntity of syncEntities) {
    const delKeys =
      entityPatchesUnhydrated[syncEntity.cvrNamespace]?.delKeys ?? [];
    pendingOps.push(delKeys.map((key) => ({ op: `del` as const, key })));

    const putIds =
      entityPatchesUnhydrated[syncEntity.cvrNamespace]?.putIds ?? [];
    pendingOps.push(syncEntity.fetchEntityPutOps(db, putIds));
  }

  const ops = await Promise.all(pendingOps);
  return ops.flat();
}

function diffLastMutationIds(
  prev: Record<string, number>,
  next: Record<string, number>,
) {
  return pickBy(next, (v, k) => prev[k] !== v);
}

function isEmptyPatch(patchOps: PatchOpsUnhydrated) {
  return Object.values(patchOps).every(
    (p) => p.putIds.length === 0 && p.delKeys.length === 0,
  );
}

function isCvrLastMutationIdsDiffEmpty(diff: Record<string, number>) {
  return Object.keys(diff).length === 0;
}

// Implements the push algorithm from
// https://doc.replicache.dev/strategies/row-version#push
export async function processMutation(
  db: Drizzle,
  userId: string,
  clientGroupId: string,
  clientGroupSchemaVersion: string,
  mutation: ReplicacheMutation,
  // 1: `let errorMode = false`. In JS, we implement this step naturally
  // as a param. In case of failure, caller will call us again with `true`.
  errorMode: boolean,
): Promise<boolean> {
  return startSpan({ name: processMutation.name }, async () => {
    // 2: beginTransaction
    return db.transaction(async (db) => {
      debug(`Processing mutation errorMode=%o %o`, errorMode, mutation);

      // 3: `getClientGroup(body.clientGroupID)`
      // 4: Verify requesting user owns cg (in function)
      const clientGroup = await getClientGroup(db, {
        userId,
        clientGroupId,
        schemaVersion: clientGroupSchemaVersion,
      });
      // 5: `getClient(mutation.clientID)`
      // 6: Verify requesting client group owns requested client
      const prevClient = await getClient(db, mutation.clientId, clientGroupId);

      // 7: init nextMutationID
      const nextMutationId = prevClient.lastMutationId + 1;

      // 8: rollback and skip if already processed.
      if (mutation.id < nextMutationId) {
        debug(`Mutation %s has already been processed - skipping`, mutation.id);
        return false;
      }

      // 9: Rollback and error if from future.
      if (mutation.id > nextMutationId) {
        throw new Error(
          `Mutation ${mutation.id} is from the future - aborting`,
        );
      }

      const t1 = Date.now();

      if (!errorMode) {
        try {
          // 10(i): Run business logic
          // 10(i)(a): xmin column is automatically updated by Postgres for any affected rows.
          await mutate(db, userId, mutation);
        } catch (error) {
          // 10(ii)(a-c): log error, abort, and retry
          debug(`Error executing mutation: %o %o`, mutation, error);
          throw error;
        }
      }

      // 11-12: put client and client group
      await putClientGroup(db, clientGroup);
      await putClient(db, {
        id: mutation.clientId,
        clientGroupId,
        lastMutationId: nextMutationId,
      });

      debug(`Processed mutation in %s`, Date.now() - t1);

      return true;
    });
  });
}

interface Client {
  id: string;
  clientGroupId: string;
  lastMutationId: number;
}

export async function putClient(db: Drizzle, client: Client) {
  const { id, clientGroupId, lastMutationId } = client;

  await db
    .insert(s.replicacheClient)
    .values({
      id,
      clientGroupId,
      lastMutationId,
    })
    .onConflictDoUpdate({
      target: s.replicacheClient.id,
      set: { lastMutationId, updatedAt: new Date() },
    });
}

export interface ClientGroup {
  id: string;
  userId: string;
  schemaVersion: string;
  cvrVersion: number;
}

export async function putClientGroup(db: Drizzle, clientGroup: ClientGroup) {
  const { id, userId, cvrVersion, schemaVersion } = clientGroup;

  await db
    .insert(s.replicacheClientGroup)
    .values({ id, userId, cvrVersion, schemaVersion })
    .onConflictDoUpdate({
      target: s.replicacheClientGroup.id,
      set: { cvrVersion, updatedAt: new Date() },
    });
}

export async function getClientGroup(
  db: Drizzle,
  opts: {
    userId: string;
    clientGroupId: string;
    schemaVersion: string;
  },
): Promise<ClientGroup> {
  const r = await db.query.replicacheClientGroup.findFirst({
    where: (p, { eq }) => eq(p.id, opts.clientGroupId),
  });

  if (!r) {
    return {
      id: opts.clientGroupId,
      userId: opts.userId,
      cvrVersion: 0,
      schemaVersion: opts.schemaVersion,
    };
  }

  if (r.userId !== opts.userId) {
    throw new Error(`Authorization error - user does not own client group`);
  }

  return {
    id: opts.clientGroupId,
    userId: r.userId,
    cvrVersion: r.cvrVersion,
    schemaVersion: r.schemaVersion,
  };
}

export async function getClient(
  db: Drizzle,
  clientId: string,
  clientGroupId: string,
): Promise<Client> {
  const r = await db.query.replicacheClient.findFirst({
    where: (p, { eq }) => eq(p.id, clientId),
  });

  if (!r) {
    return {
      id: clientId,
      clientGroupId: ``,
      lastMutationId: 0,
    };
  }

  if (r.clientGroupId !== clientGroupId) {
    throw new Error(
      `Authorization error - client does not belong to client group`,
    );
  }

  return {
    id: r.id,
    clientGroupId: r.clientGroupId,
    lastMutationId: r.lastMutationId,
  };
}

type EntityState = {
  id: string;
  key?: string;
  xmin: Xmin;
}[];

type EntitiesState = Record<CvrNamespace, EntityState>;

export async function computeEntitiesState(
  db: Drizzle,
  userId: string,
): Promise<EntitiesState> {
  return startSpan({ name: computeEntitiesState.name }, async () => {
    const subQueries = syncEntities.map(
      (syncEntity) =>
        [
          syncEntity.cvrNamespace,
          syncEntity.entityStateSubquery(db, userId),
        ] as const,
    );

    let query = db
      .select(
        Object.fromEntries(
          subQueries.map(
            ([cvrNamespace, subQuery]) => [cvrNamespace, subQuery.map] as const,
          ),
        ) as Record<CvrNamespace, SQL.Aliased<EntityState>>,
      )
      .from(nonNullable(subQueries[0])[1])
      .leftJoin(nonNullable(subQueries[1])[1], sql`true`);
    for (const [, subQuery] of subQueries.slice(2)) {
      query = query.leftJoin(subQuery, sql`true`);
    }

    const [result] = await query;

    return nonNullable(result);
  });
}

export type RetryMutationResult =
  | { success: true }
  | { success: false; error: string; stack?: string };

/**
 * Retry a single failed mutation by its record ID.
 * Fetches the mutation context (userId, clientGroupId, schemaVersion) from the database
 * and attempts to re-process the mutation.
 *
 * @param db - Database connection (should be in a repeatable read transaction)
 * @param mutationRecordId - The ID from the replicacheMutation table
 * @returns Result indicating success or failure with error message
 */
export async function retryMutation(
  db: Drizzle,
  mutationRecordId: string,
): Promise<RetryMutationResult> {
  // Fetch mutation with its context
  const record = await db
    .select({
      id: s.replicacheMutation.id,
      clientId: s.replicacheMutation.clientId,
      mutationId: s.replicacheMutation.mutationId,
      mutation: s.replicacheMutation.mutation,
      success: s.replicacheMutation.success,
      clientGroupId: s.replicacheClient.clientGroupId,
      userId: s.replicacheClientGroup.userId,
      schemaVersion: s.replicacheClientGroup.schemaVersion,
    })
    .from(s.replicacheMutation)
    .innerJoin(
      s.replicacheClient,
      eq(s.replicacheMutation.clientId, s.replicacheClient.id),
    )
    .innerJoin(
      s.replicacheClientGroup,
      eq(s.replicacheClient.clientGroupId, s.replicacheClientGroup.id),
    )
    .where(eq(s.replicacheMutation.id, mutationRecordId))
    .limit(1)
    .then((rows) => rows[0]);

  if (record == null) {
    return {
      success: false,
      error: `Mutation record not found: ${mutationRecordId}`,
    };
  }

  const parsedMutation = replicacheMutationSchema.parse(record.mutation);

  try {
    // Run the mutation business logic directly, bypassing processMutation's
    // lastMutationId checks since we're retrying a previously-recorded mutation
    await mutate(db, record.userId, parsedMutation);

    // Update the mutation record to success
    await db
      .update(s.replicacheMutation)
      .set({ success: true, processedAt: new Date() })
      .where(eq(s.replicacheMutation.id, mutationRecordId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
}
