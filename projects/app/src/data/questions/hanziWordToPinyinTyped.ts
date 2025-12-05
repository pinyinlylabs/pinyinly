import { matchAllPinyinSyllables } from "@/data/pinyin";
import { loadDictionary } from "@/dictionary";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type {
  HanziWordSkill,
  HanziWordToPinyinTypedQuestion,
  MistakeType,
  PinyinPronunciation,
  Question,
  QuestionFlagType,
  UnsavedSkillRating,
} from "../model";
import { MistakeKind, QuestionKind } from "../model";
import { computeSkillRating, hanziWordFromSkill } from "../skills";

export async function hanziWordToPinyinTypedQuestionOrThrow(
  skill: HanziWordSkill,
  flag: QuestionFlagType | null,
): Promise<HanziWordToPinyinTypedQuestion> {
  const hanziWord = hanziWordFromSkill(skill);
  const dictionary = await loadDictionary();
  const meaning = dictionary.lookupHanziWord(hanziWord);

  const answers = meaning?.pinyin;
  invariant(answers != null, `hanzi word ${hanziWord} has no pinyin`);

  return validQuestionInvariant({
    kind: QuestionKind.HanziWordToPinyinTyped,
    answers,
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

  // Check if the answer is correct
  for (const expectedSyllables of question.answers) {
    const isCorrect =
      expectedSyllables.length === actualSyllables.length &&
      expectedSyllables.every((syllable, i) => syllable === actualSyllables[i]);

    if (isCorrect) {
      const correct = true;
      return {
        correct,
        skillRatings: [
          computeSkillRating({
            skill: question.skill,
            correct,
            durationMs,
          }),
        ],
      };
    }
  }

  // Report a mistake
  {
    const correct = false;
    const expectedAnswer = nonNullable(question.answers[0]);
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
