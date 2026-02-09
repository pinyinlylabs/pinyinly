import { loadDictionary } from "@/dictionary";
import type { FsrsState } from "@/util/fsrs";
import { nextReview } from "@/util/fsrs";
import type {
  RizzleReplicacheMutators,
  RizzleReplicacheMutatorTx,
} from "@/util/rizzle";
import { sortComparatorDate } from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import {
  nextReviewForOtherSkillMistake,
  skillsToReReviewForHanziGlossMistake,
  skillsToReReviewForHanziPinyinMistake,
} from "./mistakes";
import type {
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
  Skill,
} from "./model";
import { AssetStatusKind, MistakeKind } from "./model";
import type { currentSchema } from "./rizzleSchema";
import { srsStateFromFsrsState } from "./rizzleSchema";

type Tx = RizzleReplicacheMutatorTx<typeof currentSchema>;

async function fsrsStateForSkill(tx: Tx, skill: Skill) {
  const skillRatingsByDate = await tx.skillRating
    .bySkill(skill)
    .toArray()
    .then((x) =>
      x
        // Filter out trashed ratings
        .filter(([, r]) => r.trashedAt == null)
        .sort(sortComparatorDate((x) => x[1].createdAt)),
    );
  let fsrsState: FsrsState | null = null;
  for (const [, { rating, createdAt }] of skillRatingsByDate) {
    fsrsState = nextReview(fsrsState, rating, createdAt);
  }
  return fsrsState;
}

export const mutators: RizzleReplicacheMutators<typeof currentSchema> = {
  async rateSkill(tx, { id, skill, rating, durationMs, now, reviewId }) {
    // Save a record of the rating.
    await tx.skillRating.set(
      { id },
      { id, rating, skill, durationMs, createdAt: now, reviewId },
    );

    const fsrsState = await fsrsStateForSkill(tx, skill);

    invariant(fsrsState !== null);

    await tx.skillState.set(
      { skill },
      { skill, srs: srsStateFromFsrsState(fsrsState) },
    );
  },
  async setPinyinSoundName(tx, { soundId, name }) {
    const existing = await tx.pinyinSound.get({ soundId });
    await tx.pinyinSound.set({ soundId }, { ...existing, soundId, name });
  },
  async setPinyinSoundGroupName(tx, { soundGroupId, name }) {
    const existing = await tx.pinyinSoundGroup.get({ soundGroupId });
    await tx.pinyinSoundGroup.set(
      { soundGroupId },
      { ...existing, soundGroupId, name },
    );
  },
  async setPinyinSoundGroupTheme(tx, { soundGroupId, theme }) {
    const existing = await tx.pinyinSoundGroup.get({ soundGroupId });
    await tx.pinyinSoundGroup.set(
      { soundGroupId },
      { ...existing, soundGroupId, theme },
    );
  },
  async saveHanziGlossMistake(
    tx,
    { id, gloss, hanziOrHanziWord, now, reviewId },
  ) {
    await tx.hanziGlossMistake.set(
      { id },
      { id, gloss, hanziOrHanziWord, createdAt: now, reviewId },
    );

    // Mutator must be run in one task. Only microtask async is allowed, but
    // since the dictionary loads data over the network it's possible that it's
    // not already cached. This guard acts as a no-op if it's too slow.
    //
    // TODO: make more ergonomic
    //
    // SAME AS saveHanziPinyinMistake
    if (loadDictionary.isCached()) {
      const mistake: HanziGlossMistakeType = {
        kind: MistakeKind.HanziGloss,
        gloss,
        hanziOrHanziWord,
      };

      // Queue all skills relevant to the gloss.
      for (const skill of await skillsToReReviewForHanziGlossMistake(mistake)) {
        const existing = await tx.skillState.get({ skill });
        if (existing) {
          const srs = nextReviewForOtherSkillMistake(existing.srs, now);
          await tx.skillState.set({ skill }, { skill, srs });
        }
      }
    } else {
      console.warn(
        `saveHanziGlossMistake: dictionary is not already loaded, bailing out`,
      );
    }
  },
  async saveHanziPinyinMistake(
    tx,
    { id, pinyin, hanziOrHanziWord, now, reviewId },
  ) {
    await tx.hanziPinyinMistake.set(
      { id },
      { id, pinyin, hanziOrHanziWord, createdAt: now, reviewId },
    );

    // Mutator must be run in one task. Only microtask async is allowed, but
    // since the dictionary loads data over the network it's possible that it's
    // not already cached. This guard acts as a no-op if it's too slow.
    //
    // TODO: make more ergonomic
    //
    // SAME AS saveHanziGlossMistake
    if (loadDictionary.isCached()) {
      const mistake: HanziPinyinMistakeType = {
        kind: MistakeKind.HanziPinyin,
        pinyin,
        hanziOrHanziWord,
      };

      // Queue all skills relevant to the gloss.
      for (const skill of await skillsToReReviewForHanziPinyinMistake(
        mistake,
      )) {
        const existing = await tx.skillState.get({ skill });
        if (existing) {
          const srs = nextReviewForOtherSkillMistake(existing.srs, now);
          await tx.skillState.set({ skill }, { skill, srs });
        }
      }
    } else {
      console.warn(
        `saveHanziPinyinMistake: dictionary is not already loaded, bailing out`,
      );
    }
  },
  async setSetting(tx, { key, value }) {
    await tx.setting.set({ key }, { key, value });
  },
  async undoReview(tx, { reviewId, now }) {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const nowTime = now.getTime();

    // Find all skill ratings with this reviewId (scan and filter since reviewId is nullable)
    const allSkillRatings = await tx.skillRating.scan({}).toArray();
    const skillRatings = allSkillRatings.filter(
      ([, r]) => r.reviewId === reviewId,
    );

    // Check if any rating is too old (beyond 1-day undo window)
    // If so, silently return without undoing
    for (const [, rating] of skillRatings) {
      if (nowTime - rating.createdAt.getTime() > ONE_DAY_MS) {
        return;
      }
    }

    // Mark all skill ratings as trashed
    const affectedSkills = new Set<Skill>();
    for (const [, rating] of skillRatings) {
      await tx.skillRating.set(
        { id: rating.id },
        { ...rating, trashedAt: now },
      );
      affectedSkills.add(rating.skill);
    }

    // Mark all gloss mistakes with this reviewId as trashed (scan and filter)
    const allGlossMistakes = await tx.hanziGlossMistake.scan({}).toArray();
    const glossMistakes = allGlossMistakes.filter(
      ([, m]) => m.reviewId === reviewId,
    );
    for (const [, mistake] of glossMistakes) {
      await tx.hanziGlossMistake.set(
        { id: mistake.id },
        { ...mistake, trashedAt: now },
      );
    }

    // Mark all pinyin mistakes with this reviewId as trashed (scan and filter)
    const allPinyinMistakes = await tx.hanziPinyinMistake.scan({}).toArray();
    const pinyinMistakes = allPinyinMistakes.filter(
      ([, m]) => m.reviewId === reviewId,
    );
    for (const [, mistake] of pinyinMistakes) {
      await tx.hanziPinyinMistake.set(
        { id: mistake.id },
        { ...mistake, trashedAt: now },
      );
    }

    // Recalculate SRS state for all affected skills
    for (const skill of affectedSkills) {
      const fsrsState = await fsrsStateForSkill(tx, skill);

      if (fsrsState === null) {
        // No ratings left - skill goes back to "unstudied" state.
        // Since we can't delete, we skip updating. The old skillState remains
        // but the queue logic filters by ratings anyway.
        continue;
      }

      await tx.skillState.set(
        { skill },
        { skill, srs: srsStateFromFsrsState(fsrsState) },
      );
    }
  },
  async initAsset(tx, { assetId, contentType, contentLength, now }) {
    await tx.asset.set(
      { assetId },
      {
        assetId,
        status: AssetStatusKind.Pending,
        contentType,
        contentLength,
        createdAt: now,
      },
    );
  },
  async confirmAssetUpload(tx, { assetId, now }) {
    const existing = await tx.asset.get({ assetId });
    if (existing == null) {
      // Asset record doesn't exist, create it as uploaded
      // This can happen if the mutation was lost but upload succeeded
      return;
    }
    await tx.asset.set(
      { assetId },
      {
        ...existing,
        status: AssetStatusKind.Uploaded,
        uploadedAt: now,
      },
    );
  },
  async failAssetUpload(tx, { assetId, errorMessage, now: _now }) {
    const existing = await tx.asset.get({ assetId });
    if (existing == null) {
      return;
    }
    await tx.asset.set(
      { assetId },
      {
        ...existing,
        status: AssetStatusKind.Failed,
        errorMessage,
      },
    );
  },
};
