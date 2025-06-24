import { hanziCharCount } from "@/data/hanzi";
import type {
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
  MistakeType,
  OneCorrectPairQuestion,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
} from "@/data/model";
import { MistakeKind } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";
import { emptyArray } from "@/util/collections";
import { invariant, uniqueInvariant } from "@pinyinly/lib/invariant";

export function oneCorrectPairChoiceText(
  choice: OneCorrectPairQuestionChoice,
): string {
  switch (choice.kind) {
    case `gloss`: {
      return choice.value;
    }
    case `hanzi`: {
      return choice.value;
    }
    case `pinyin`: {
      return pinyinPronunciationDisplayText(choice.value);
    }
  }
}

export function hanziOrPinyinSyllableCount(
  choice: OneCorrectPairQuestionChoice,
): number {
  switch (choice.kind) {
    case `hanzi`: {
      return hanziCharCount(choice.value);
    }
    case `pinyin`: {
      return choice.value.length;
    }
    case `gloss`: {
      throw new Error(`unexpected gloss choice in HanziWordToPinyin`);
    }
  }
}

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

/**
 * Determine if the user's answer is correct, and if not returning 1 or more
 * mistakes.
 */
export function oneCorrectPairQuestionMistakes(
  answer: OneCorrectPairQuestionAnswer,
  aChoice: OneCorrectPairQuestionChoice,
  bChoice: OneCorrectPairQuestionChoice,
): readonly MistakeType[] {
  if (answer.as.includes(aChoice) && answer.bs.includes(bChoice)) {
    return emptyArray;
  }

  const mistakes: MistakeType[] = [];

  const mistakeChecks = [
    oneCorrectPairQuestionHanziGlossMistake,
    oneCorrectPairQuestionHanziPinyinMistake,
  ];
  // Check all combinations of the choices, this makes each check simpler as it
  // doesn't need to consider each direction.
  const choicePairs = [
    [aChoice, bChoice],
    [bChoice, aChoice],
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

export function oneCorrectPairQuestionInvariant(
  question: OneCorrectPairQuestion,
) {
  // Ensure there aren't two identical choices in the same group.
  uniqueInvariant(question.groupA.map((x) => oneCorrectPairChoiceText(x)));
  uniqueInvariant(question.groupB.map((x) => oneCorrectPairChoiceText(x)));
  // Ensure the answer is included.
  invariant(question.answer.as.every((a) => question.groupA.includes(a)));
  invariant(question.answer.bs.every((b) => question.groupB.includes(b)));
  // Ensure there's at least one wrong choice in each group.
  invariant(question.answer.as.length < question.groupA.length);
  invariant(question.answer.bs.length < question.groupB.length);
}
