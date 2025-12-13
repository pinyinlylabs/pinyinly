import type {
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  PinyinText,
} from "#data/model.ts";
import { MistakeKind } from "#data/model.ts";
import {
  gradeOneCorrectPairQuestion,
  hanziOrPinyinSyllableCount,
} from "#data/questions/oneCorrectPair.ts";
import { hanziWordToGloss, hanziWordToPinyinTone } from "#data/skills.ts";
import { describe, expect, test } from "vitest";
import { 拼音, 汉 } from "../helpers.ts";

describe(
  `gradeOneCorrectPairQuestion suite` satisfies HasNameOf<
    typeof gradeOneCorrectPairQuestion
  >,
  async () => {
    test(`correct when A choice is correct and B choice is correct`, async () => {
      const a: OneCorrectPairQuestionChoice = { kind: `hanzi`, value: 汉`好` };
      const b: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: 拼音`hǎo`,
      };
      const answer: OneCorrectPairQuestionAnswer = {
        as: [a],
        bs: [b],
        skill: hanziWordToPinyinTone(`好:good`),
      };

      const grade = gradeOneCorrectPairQuestion(answer, a, b, 1000);
      expect(grade.correct).toBe(true);
    });

    test(`hanzi↔gloss / gloss↔hanzi incorrect`, async () => {
      const answer = { as: [], bs: [], skill: hanziWordToGloss(`好:good`) };
      const choice1 = { kind: `hanzi`, value: 汉`好` } as const;
      const choice2 = { kind: `gloss`, value: `good` } as const;
      const combinations = [
        [choice1, choice2],
        [choice2, choice1],
      ] as const;
      const mistake = {
        kind: MistakeKind.HanziGloss,
        hanziOrHanziWord: `好`,
        gloss: `good`,
      };

      for (const [a, b] of combinations) {
        const grade = gradeOneCorrectPairQuestion(answer, a, b, 1000);
        expect(grade.correct).toBe(false);
        if (!grade.correct) {
          expect(grade.mistakes).toEqual([mistake]);
        }
      }
    });

    test(`hanzi↔pinyin / pinyin↔hanzi incorrect`, async () => {
      const answer = { as: [], bs: [], skill: hanziWordToGloss(`好:good`) };
      const choice1 = { kind: `hanzi`, value: 汉`好` } as const;
      const choice2 = { kind: `pinyin`, value: 拼音`hǎo` } as const;
      const combinations = [
        [choice1, choice2],
        [choice2, choice1],
      ] as const;
      const mistake = {
        kind: MistakeKind.HanziPinyin,
        hanziOrHanziWord: `好`,
        pinyin: `hǎo`,
      };

      for (const [a, b] of combinations) {
        const grade = gradeOneCorrectPairQuestion(answer, a, b, 1000);
        expect(grade.correct).toBe(false);
        if (!grade.correct) {
          expect(grade.mistakes).toEqual([mistake]);
        }
      }
    });
  },
);

describe(
  `hanziOrPinyinSyllableCount suite` satisfies HasNameOf<
    typeof hanziOrPinyinSyllableCount
  >,
  () => {
    test(`single hanzi character`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `hanzi`,
        value: 汉`好`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(1);
    });

    test(`multiple hanzi characters`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `hanzi`,
        value: 汉`你好`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(2);
    });

    test(`single pinyin syllable`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: 拼音`hǎo`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(1);
    });

    test(`multiple pinyin syllables with space`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: 拼音`nǐ hǎo`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(2);
    });

    test(`multiple pinyin syllables with multiple spaces`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: 拼音`nǐ  hǎo`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(2);
    });

    test(`pinyin with no spaces (single word)`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: 拼音`māma`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(2);
    });

    test(`pinyin with mixed spacing (two words)`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: 拼音`nǐ hǎo māma`,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(4);
    });

    test(`empty pinyin string`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: `` as PinyinText,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(0);
    });

    test(`pinyin with only spaces`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: `   ` as PinyinText,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(0);
    });

    test(`pinyin with leading and trailing spaces`, () => {
      const choice: OneCorrectPairQuestionChoice = {
        kind: `pinyin`,
        value: `  nǐ hǎo  ` as PinyinText,
      };
      expect(hanziOrPinyinSyllableCount(choice)).toBe(2);
    });
  },
);
