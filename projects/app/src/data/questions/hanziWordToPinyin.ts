import { matchAllPinyinSyllables } from "@/data/pinyin";
import { lookupHanziWord } from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import type {
  HanziWordToPinyinQuestion,
  MistakeType,
  Question,
} from "../model";
import { MistakeKind, QuestionKind } from "../model";
import type { HanziWordSkill } from "../rizzleSchema";
import { hanziWordFromSkill } from "../skills";

export async function hanziWordToPinyinQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<HanziWordToPinyinQuestion> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);

  const answers = meaning?.pinyin;
  invariant(answers != null, `hanzi word ${hanziWord} has no pinyin`);

  return validQuestionInvariant({
    kind: QuestionKind.HanziWordToPinyin,
    answers,
    skill,
  });
}

function validQuestionInvariant<T extends Question>(question: T): T {
  switch (question.kind) {
    case QuestionKind.OneCorrectPair:
    case QuestionKind.HanziWordToPinyin:
    case QuestionKind.MultipleChoice: {
      break;
    }
  }

  return question;
}

/**
 * Determine if the user's answer is correct, and if not returning 1 or more
 * mistakes.
 */
export function hanziToPinyinQuestionMistakes(
  question: HanziWordToPinyinQuestion,
  userAnswer: string,
): MistakeType[] {
  const mistakes: MistakeType[] = [];

  let actualSyllables = matchAllPinyinSyllables(userAnswer);

  // If there were no syllables found (e.g. the user entered some invalid pinyin
  // like "x x") then still have a go at parsing it.
  if (actualSyllables.length === 0) {
    actualSyllables = userAnswer.split(/\s+/g).filter((x) => x.length > 0);
  }

  for (const [i, expectedSyllables] of question.answers.entries()) {
    const isLastChance = i === question.answers.length - 1;
    const isCorrect = expectedSyllables.every(
      (syllable, i) => syllable === actualSyllables[i],
    );

    if (isCorrect) {
      return [];
    }

    if (isLastChance) {
      // Push a single mistake for the whole word, not per syllable. This might be
      // something that's changed in the future, but for now it's simple.
      mistakes.push({
        kind: MistakeKind.HanziPinyin,
        hanziOrHanziWord: hanziWordFromSkill(question.skill),
        pinyin: actualSyllables,
      });
    }
  }

  return mistakes;
}
