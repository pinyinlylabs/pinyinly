import type {
  HanziToPinyinQuestion,
  MistakeType,
  OneCorrectPairQuestionChoice,
  PinyinSyllable,
} from "@/data/model";
import { invariant } from "@haohaohow/lib/invariant";
import type { HanziGlossMistakeType, HanziPinyinMistakeType } from "./model";
import { MistakeKind } from "./model";
import { hanziWordFromSkill } from "./skills";

export function hanziGlossMistake(
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

export function hanziPinyinMistake(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): HanziPinyinMistakeType | undefined {
  if (choice1.kind === `hanzi` && choice2.kind === `pinyin`) {
    return {
      kind: MistakeKind.HanziPinyin,
      hanziOrHanziWord: choice1.value,
      pinyin:
        typeof choice2.value === `string` ? [choice2.value] : choice2.value,
    };
  }
}

export function oneCorrectPairQuestionChoiceMistakes(
  choice1: OneCorrectPairQuestionChoice,
  choice2: OneCorrectPairQuestionChoice,
): MistakeType[] {
  const mistakes: MistakeType[] = [];

  const mistakeChecks = [hanziGlossMistake, hanziPinyinMistake];
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

  const firstAnswer = question.answers[0];
  invariant(firstAnswer != null, `expected answer to be defined`);
  const answer: readonly PinyinSyllable[] | undefined =
    typeof firstAnswer === `string` ? [firstAnswer] : firstAnswer;

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
