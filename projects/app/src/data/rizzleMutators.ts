import { loadDictionary } from "@/dictionary/dictionary";
import { sortComparatorDate } from "@/util/collections";
import { FsrsState, nextReview } from "@/util/fsrs";
import { RizzleReplicacheMutators } from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import { MistakeType } from "./model";
import { srsStateFromFsrsState, v7 } from "./rizzleSchema";
import {
  nextReviewForOtherSkillMistake,
  skillsToReReviewForHanziGlossMistake,
} from "./skills";

export const v7Mutators: RizzleReplicacheMutators<typeof v7> = {
  async rateSkill(tx, { id, skill, rating, now }) {
    // Save a record of the rating.
    await tx.skillRating.set({ id }, { id, rating, skill, createdAt: now });

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
  async saveHanziGlossMistake(tx, { id, gloss, hanzi, now }) {
    await tx.hanziGlossMistake.set(
      { id },
      { id, gloss, hanzi, createdAt: now },
    );

    // Mutator must be run in one task. Only microtask async is allowed, but
    // since the dictionary loads data over the network it's possible that it's
    // not already cached. This guard acts as a no-op if it's too slow.
    //
    // TODO: make more ergonomic
    if (loadDictionary.isCached()) {
      const mistake = { type: MistakeType.HanziGloss, gloss, hanzi } as const;

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
};
