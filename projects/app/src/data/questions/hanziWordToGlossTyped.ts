import { hanziFromHanziWord, loadDictionary } from "@/dictionary/dictionary";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { Mutable } from "@pinyinly/lib/types";
import type {
  HanziWordToGlossTypedQuestion,
  HanziWordToGlossTypedSkill,
  MistakeType,
  QuestionFlagType,
  UnsavedSkillRating,
} from "../model";
import { MistakeKind, QuestionFlagKind, QuestionKind } from "../model";
import {
  computeSkillRating,
  hanziWordFromSkill,
  hanziWordToGlossTyped,
} from "../skills";

export async function hanziWordToGlossTypedQuestionOrThrow(
  skill: HanziWordToGlossTypedSkill,
  flag?: QuestionFlagType,
): Promise<HanziWordToGlossTypedQuestion> {
  const hanziWord = hanziWordFromSkill(skill);
  const hanzi = hanziFromHanziWord(hanziWord);
  const dictionary = await loadDictionary();

  const bannedMeaningPrimaryGlossHint: Mutable<
    HanziWordToGlossTypedQuestion[`bannedMeaningPrimaryGlossHint`]
  > = [];
  const answers: HanziWordToGlossTypedQuestion[`answers`] = [];

  const previousHanziWords =
    flag?.kind === QuestionFlagKind.OtherMeaning
      ? flag.previousHanziWords
      : null;
  for (const [dictionaryHanziWord, dictionaryMeaning] of dictionary.lookupHanzi(
    hanzi,
  )) {
    if (previousHanziWords?.includes(dictionaryHanziWord) === true) {
      bannedMeaningPrimaryGlossHint.push(
        nonNullable(dictionaryMeaning.gloss[0]),
      );
    } else {
      answers.push({
        skill: hanziWordToGlossTyped(dictionaryHanziWord),
        glosses: dictionaryMeaning.gloss,
      });
    }
  }

  return {
    kind: QuestionKind.HanziWordToGlossTyped,
    answers,
    skill,
    bannedMeaningPrimaryGlossHint,
    flag,
  };
}

export type HanziToGlossTypedQuestionGrade =
  | {
      correct: true;
      skillRatings: UnsavedSkillRating[];
    }
  | {
      correct: false;
      skillRatings: UnsavedSkillRating[];
      expectedAnswer: string;
      mistakes: MistakeType[];
    };

/**
 * Determine if the user's answer is correct, and if not returning 1 or more
 * mistakes.
 */
export function gradeHanziToGlossTypedQuestion(
  question: HanziWordToGlossTypedQuestion,
  userGloss: string,
  durationMs: number,
): HanziToGlossTypedQuestionGrade {
  // Look for a correct answer.
  for (const { skill, glosses } of question.answers) {
    if (glosses.includes(userGloss)) {
      const correct = true;
      return {
        correct,
        skillRatings: [
          computeSkillRating({
            skill,
            correct,
            durationMs,
          }),
        ],
      };
    }
  }

  // Report a mistake.
  {
    const correct = false;
    const expectedGloss = nonNullable(
      question.answers.find((a) => a.skill === question.skill)?.glosses[0],
    );
    return {
      correct,
      skillRatings: [
        computeSkillRating({
          skill: question.skill,
          correct,
          durationMs,
        }),
      ],
      expectedAnswer: expectedGloss,
      mistakes: [
        {
          kind: MistakeKind.HanziGloss,
          hanziOrHanziWord: hanziWordFromSkill(question.skill),
          gloss: userGloss,
        },
      ],
    };
  }
}
