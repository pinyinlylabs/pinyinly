import { hanziCharCount } from "@/data/hanzi";
import type {
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
  MistakeType,
  OneCorrectPairQuestionChoice,
} from "@/data/model";
import { MistakeKind } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";

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
