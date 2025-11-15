import { lookupHanziWord } from "@/dictionary/dictionary";
import { invariant } from "@pinyinly/lib/invariant";
import type {
  HanziGlossMistakeType,
  HanziWordToGlossQuestion,
  MistakeType,
} from "../model";
import { MistakeKind, QuestionKind } from "../model";
import type { HanziWordSkill } from "../rizzleSchema";
import { hanziWordFromSkill } from "../skills";

export async function hanziWordToGlossTypedQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<HanziWordToGlossQuestion> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);

  const answers = meaning?.gloss ?? [];
  invariant(answers.length > 0, `hanzi word ${hanziWord} has no gloss`);

  return {
    kind: QuestionKind.HanziWordToGloss,
    answers,
    skill,
  };
}

/**
 * Determine if the user's answer is correct, and if not returning 1 or more
 * mistakes.
 */
export function hanziToGlossTypedQuestionMistakes(
  question: HanziWordToGlossQuestion,
  userAnswer: string,
): MistakeType[] {
  const mistakes: HanziGlossMistakeType[] = [];

  for (const [i, expectedAnswer] of question.answers.entries()) {
    const isLastChance = i === question.answers.length - 1;
    const isCorrect = userAnswer === expectedAnswer;

    if (isCorrect) {
      return [];
    }

    if (isLastChance) {
      // Push a single mistake for the whole word, not per syllable. This might be
      // something that's changed in the future, but for now it's simple.
      mistakes.push({
        kind: MistakeKind.HanziGloss,
        hanziOrHanziWord: hanziWordFromSkill(question.skill),
        gloss: userAnswer,
      });
    }
  }

  return mistakes;
}
