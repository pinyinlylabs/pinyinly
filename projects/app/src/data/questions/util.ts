import type {
  HanziWord,
  OneCorrectPairQuestionChoice,
  PinyinPronunciation,
  PinyinSyllable,
} from "@/data/model";
import type { HanziWordMeaning } from "@/dictionary/dictionary";
import { characterCount, pinyinOrThrow } from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import type { DeepReadonly } from "ts-essentials";

export function hanziOrPinyinWordCount(
  choice: OneCorrectPairQuestionChoice,
): number {
  switch (choice.kind) {
    case `hanzi`: {
      return characterCount(choice.value);
    }
    case `pinyin`: {
      return typeof choice.value === `string` ? 1 : choice.value.length;
    }
    case `gloss`: {
      throw new Error(`unexpected gloss choice in HanziWordToPinyin`);
    }
  }
}

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

export function pinyinPronunciationDisplayText(
  value: Readonly<PinyinPronunciation>,
): string {
  return typeof value === `string` ? value : value.join(``);
}

export function oneSyllablePinyinOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): PinyinSyllable {
  const pronunciation = pinyinOrThrow(hanziWord, meaning);
  const syllable = pronunciation[0];
  invariant(
    syllable != null && pronunciation.length === 1,
    `expected only one syllable`,
  );
  return syllable;
}
