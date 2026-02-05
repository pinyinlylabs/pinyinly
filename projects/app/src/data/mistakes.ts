import {
  hanziFromHanziOrHanziWord,
  isHanziWord,
  loadDictionary,
} from "@/dictionary";
import type {
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
  Skill,
  SrsStateType,
} from "./model";
import { SrsKind } from "./model";
import { srsStateFromFsrsState } from "./rizzleSchema";
import { hanziWordToGloss, hanziWordToPinyinTyped } from "./skills";

export async function skillsToReReviewForHanziGlossMistake(
  mistake: HanziGlossMistakeType,
): Promise<ReadonlySet<Skill>> {
  const skills = new Set<Skill>();
  const hanzi = hanziFromHanziOrHanziWord(mistake.hanziOrHanziWord);
  const dictionary = await loadDictionary();

  for (const [hanziWord] of [
    // Queue all skills relevant to the gloss.
    ...dictionary.lookupGloss(mistake.gloss),
    // Queue all skills relevant to the hanzi.
    ...dictionary.lookupHanzi(hanzi),
  ]) {
    if (hanziWord !== mistake.hanziOrHanziWord) {
      skills.add(hanziWordToGloss(hanziWord));
    }
  }

  return skills;
}

export async function skillsToReReviewForHanziPinyinMistake(
  mistake: HanziPinyinMistakeType,
): Promise<ReadonlySet<Skill>> {
  const skills = new Set<Skill>();
  const dictionary = await loadDictionary();

  if (isHanziWord(mistake.hanziOrHanziWord)) {
    // TODO: work out the appropriate skills to review in this case.
    return skills;
  }

  // Queue all skills relevant to the hanzi.
  for (const [hanziWord] of dictionary.lookupHanzi(mistake.hanziOrHanziWord)) {
    skills.add(hanziWordToPinyinTyped(hanziWord));
  }

  return skills;
}

/**
 * Update the SRS state a skill that's related to a mistake that was made that
 * wasn't tied to a specific skill. It should make the skill reviewed again
 * soon.
 */
export function nextReviewForOtherSkillMistake<T extends SrsStateType>(
  srs: T,
  now: Date,
): T {
  switch (srs.kind) {
    case SrsKind.Mock: {
      return srs;
    }
    case SrsKind.FsrsFourPointFive: {
      // Schedule the skill for immediate review, but don't actually mark it as
      // an error (`Rating.Again`) otherwise the difficulty and stability will
      // change, but they haven't actually made a mistake yet on that skill.
      return srsStateFromFsrsState({
        ...srs,
        nextReviewAt: now,
      }) as T;
    }
  }
}
