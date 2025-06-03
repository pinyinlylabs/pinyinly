import type {
  HanziText,
  HanziToPinyinQuestion,
  HanziWord,
  MistakeType,
  OneCorrectPairQuestionChoice,
  SrsStateType,
} from "@/data/model";
import { nonNullable } from "@haohaohow/lib/invariant";
import {
  hanziFromHanziWord,
  isHanziWord,
  lookupGloss,
  lookupHanzi,
} from "../dictionary/dictionary";
import type { HanziGlossMistakeType, HanziPinyinMistakeType } from "./model";
import { MistakeKind, SrsKind } from "./model";
import type { Skill } from "./rizzleSchema";
import { srsStateFromFsrsState } from "./rizzleSchema";
import {
  hanziWordFromSkill,
  hanziWordToGloss,
  hanziWordToPinyin,
} from "./skills";

export function oneCorrectPairQuestionHanziGlossMistake(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): HanziGlossMistakeType | undefined {
  if (choice1.kind === `hanzi` && choice2.kind === `gloss`) {
    return {
      kind: MistakeKind.HanziGloss,
      hanziOrHanziWord: choice1.value,
      gloss: choice2.value,
    };
  }
}

export function oneCorrectPairQuestionHanziPinyinMistake(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): HanziPinyinMistakeType | undefined {
  if (choice1.kind === `hanzi` && choice2.kind === `pinyin`) {
    return {
      kind: MistakeKind.HanziPinyin,
      hanziOrHanziWord: choice1.value,
      pinyin: choice2.value,
    };
  }
}

export function oneCorrectPairQuestionChoiceMistakes(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): MistakeType[] {
  const mistakes: MistakeType[] = [];

  const mistakeChecks = [
    oneCorrectPairQuestionHanziGlossMistake,
    oneCorrectPairQuestionHanziPinyinMistake,
  ];
  // Check all combinations of the choices, this makes each check simpler as it
  // doesn't need to consider each direction.
  const choicePairs = [
    [choice1, choice2],
    [choice2, choice1],
  ] as const;

  for (const mistakeCheck of mistakeChecks) {
    for (const [choice1, choice2] of choicePairs) {
      const mistake = mistakeCheck(choice1, choice2);
      if (mistake) {
        mistakes.push(mistake);
      }
    }
  }

  return mistakes;
}

export function hanziToPinyinQuestionMistakes(
  question: Pick<HanziToPinyinQuestion, `answers` | `skill`>,
  userAnswer: readonly string[],
): MistakeType[] {
  const mistakes: MistakeType[] = [];

  const answer = nonNullable(question.answers[0]);

  if (!answer.every((syllable, i) => syllable === userAnswer[i])) {
    // Push a single mistake for the whole word, not per syllable. This might be
    // something that's changed in the future, but for now it's simple.
    mistakes.push({
      kind: MistakeKind.HanziPinyin,
      hanziOrHanziWord: hanziWordFromSkill(question.skill),
      pinyin: userAnswer,
    });

    // TODO: Check if the syllable EVER uses that pronunciation (i.e. in any
    // other word). If it doesn't, then add a mistake at the syllable level
    // too.
  }

  return mistakes;
}

export async function skillsToReReviewForHanziGlossMistake(
  mistake: HanziGlossMistakeType,
): Promise<ReadonlySet<Skill>> {
  const skills = new Set<Skill>();
  const hanzi = hanziFromHanziOrHanziWord(mistake.hanziOrHanziWord);

  for (const [hanziWord] of [
    // Queue all skills relevant to the gloss.
    ...(await lookupGloss(mistake.gloss)),
    // Queue all skills relevant to the hanzi.
    ...(await lookupHanzi(hanzi)),
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

  if (isHanziWord(mistake.hanziOrHanziWord)) {
    // TODO: work out the appropriate skills to review in this case.
    return skills;
  }

  // Queue all skills relevant to the hanzi.
  for (const [hanziWord] of await lookupHanzi(mistake.hanziOrHanziWord)) {
    skills.add(hanziWordToPinyin(hanziWord));
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

export function hanziFromHanziOrHanziWord(
  hanziOrHanziWord: HanziText | HanziWord,
): HanziText {
  if (isHanziWord(hanziOrHanziWord)) {
    return hanziFromHanziWord(hanziOrHanziWord);
  }
  return hanziOrHanziWord;
}
