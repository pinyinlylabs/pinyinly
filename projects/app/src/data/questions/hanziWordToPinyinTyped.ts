import { matchAllPinyinSyllables } from "@/data/pinyin";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { sortComparatorNumber } from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type { Mutable } from "@pinyinly/lib/types";
import type {
  HanziWordSkill,
  HanziWordToPinyinTypedQuestion,
  MistakeType,
  PinyinPronunciation,
  Question,
  QuestionFlagType,
  UnsavedSkillRating,
} from "../model";
import { MistakeKind, QuestionFlagKind, QuestionKind } from "../model";
import {
  computeSkillRating,
  hanziWordFromSkill,
  hanziWordToPinyinTyped,
} from "../skills";

export async function hanziWordToPinyinTypedQuestionOrThrow(
  skill: HanziWordSkill,
  flag: QuestionFlagType | null,
): Promise<HanziWordToPinyinTypedQuestion> {
  const hanziWord = hanziWordFromSkill(skill);
  const dictionary = await loadDictionary();
  const meaning = dictionary.lookupHanziWord(hanziWord);

  invariant(meaning?.pinyin != null, `hanzi word ${hanziWord} has no pinyin`);

  const bannedMeaningPinyinHint: Mutable<
    HanziWordToPinyinTypedQuestion[`bannedMeaningPinyinHint`]
  > = [];
  const answers: HanziWordToPinyinTypedQuestion[`answers`] = [];

  const previousHanziWords =
    flag?.kind === QuestionFlagKind.OtherAnswer
      ? flag.previousHanziWords
      : null;

  // Include all meanings of this hanzi as valid answers
  const hanzi = hanziFromHanziWord(hanziWord);
  for (const [dictionaryHanziWord, dictionaryMeaning] of dictionary.lookupHanzi(
    hanzi,
  )) {
    if (previousHanziWords?.includes(dictionaryHanziWord) === true) {
      // Add the primary pinyin of banned meanings as hints
      if (dictionaryMeaning.pinyin?.[0] != null) {
        bannedMeaningPinyinHint.push(dictionaryMeaning.pinyin[0]);
      }
    } else if (dictionaryMeaning.pinyin != null) {
      answers.push({
        skill: hanziWordToPinyinTyped(dictionaryHanziWord),
        pinyin: dictionaryMeaning.pinyin,
      });
    }
  }

  return validQuestionInvariant({
    kind: QuestionKind.HanziWordToPinyinTyped,
    answers,
    bannedMeaningPinyinHint,
    skill,
    flag,
  });
}

function validQuestionInvariant<T extends Question>(question: T): T {
  switch (question.kind) {
    case QuestionKind.OneCorrectPair:
    case QuestionKind.HanziWordToPinyinTyped: {
      break;
    }
    case QuestionKind.HanziWordToGlossTyped: {
      throw new Error(`unexpected question kind HanziWordToGloss`);
    }
  }

  return question;
}

export type HanziToPinyinTypedQuestionGrade =
  | {
      correct: true;
      skillRatings: UnsavedSkillRating[];
    }
  | {
      correct: false;
      skillRatings: UnsavedSkillRating[];
      expectedAnswer: Readonly<PinyinPronunciation>;
      mistakes: MistakeType[];
    };

/**
 * Determine if the user's answer is correct, and if not returning 1 or more
 * mistakes.
 */
export function gradeHanziToPinyinTypedQuestion(
  question: HanziWordToPinyinTypedQuestion,
  userAnswer: string,
  durationMs: number,
): HanziToPinyinTypedQuestionGrade {
  let actualSyllables = matchAllPinyinSyllables(userAnswer);

  // If there were no syllables found (e.g. the user entered some invalid pinyin
  // like "x x") then still have a go at parsing it.
  if (actualSyllables.length === 0) {
    actualSyllables = userAnswer.split(/\s+/g).filter((x) => x.length > 0);
  }

  // Put the skill we're testing first.
  const answers = [...question.answers].sort(
    sortComparatorNumber((x) => (x.skill === question.skill ? 0 : 1)),
  );
  // Check if the answer is correct
  for (const { skill, pinyin: pinyinOptions } of answers) {
    for (const expectedSyllables of pinyinOptions) {
      const isCorrect =
        expectedSyllables.length === actualSyllables.length &&
        expectedSyllables.every(
          (syllable, i) => syllable === actualSyllables[i],
        );

      if (isCorrect) {
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
  }

  // Report a mistake
  {
    const correct = false;
    const expectedAnswer = nonNullable(
      question.answers.find((a) => a.skill === question.skill)?.pinyin[0],
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
      expectedAnswer,
      mistakes: [
        {
          kind: MistakeKind.HanziPinyin,
          hanziOrHanziWord: hanziWordFromSkill(question.skill),
          pinyin: actualSyllables,
        },
      ],
    };
  }
}
