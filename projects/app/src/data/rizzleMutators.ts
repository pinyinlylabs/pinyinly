import { loadDictionary } from "@/dictionary/dictionary";
import { sortComparatorDate } from "@/util/collections";
import type { FsrsState } from "@/util/fsrs";
import { nextReview } from "@/util/fsrs";
import type { RizzleReplicacheMutators } from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import {
  nextReviewForOtherSkillMistake,
  skillsToReReviewForHanziGlossMistake,
  skillsToReReviewForHanziPinyinMistake,
} from "./mistakes";
import type { HanziGlossMistakeType, HanziPinyinMistakeType } from "./model";
import { MistakeKind } from "./model";
import type { currentSchema } from "./rizzleSchema";
import { srsStateFromFsrsState } from "./rizzleSchema";

export const mutators: RizzleReplicacheMutators<typeof currentSchema> = {
  async rateSkill(tx, { id, skill, rating, durationMs, now }) {
    // Save a record of the rating.
    await tx.skillRating.set(
      { id },
      { id, rating, skill, durationMs, createdAt: now },
    );

    const skillRatingsByDate = await tx.skillRating
      .bySkill(skill)
      .toArray()
      .then((x) => x.sort(sortComparatorDate((x) => x[1].createdAt)));
    let fsrsState: FsrsState | null = null;
    for (const [, { rating, createdAt }] of skillRatingsByDate) {
      fsrsState = nextReview(fsrsState, rating, createdAt);
    }

    invariant(fsrsState !== null);

    await tx.skillState.set(
      { skill },
      { skill, srs: srsStateFromFsrsState(fsrsState) },
    );
  },
  async setPinyinInitialAssociation(tx, { initial, name }) {
    await tx.pinyinInitialAssociation.set({ initial }, { initial, name });
  },
  async setPinyinFinalAssociation(tx, { final, name }) {
    await tx.pinyinFinalAssociation.set({ final }, { final, name });
  },
  async setPinyinInitialGroupTheme(tx, { groupId, themeId }) {
    await tx.pinyinInitialGroupTheme.set({ groupId }, { groupId, themeId });
  },
  async saveHanziGlossMistake(tx, { id, gloss, hanziOrHanziWord, now }) {
    await tx.hanziGlossMistake.set(
      { id },
      { id, gloss, hanziOrHanziWord, createdAt: now },
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
  async saveHanziPinyinMistake(tx, { id, pinyin, hanziOrHanziWord, now }) {
    await tx.hanziPinyinMistake.set(
      { id },
      { id, pinyin, hanziOrHanziWord, createdAt: now },
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
};
