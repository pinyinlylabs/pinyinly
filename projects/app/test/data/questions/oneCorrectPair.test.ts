import type {
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
} from "#data/model.ts";
import { MistakeKind } from "#data/model.ts";
import { oneCorrectPairQuestionMistakes } from "#data/questions/oneCorrectPair.ts";
import { hanziWordToGloss, hanziWordToPinyinTone } from "#data/skills.ts";
import { describe, expect, test } from "vitest";
import { 拼音, 汉 } from "../helpers";

describe(`${oneCorrectPairQuestionMistakes.name} suite`, async () => {
  test(`correct when A choice is correct and B choice is correct`, async () => {
    const a: OneCorrectPairQuestionChoice = { kind: `hanzi`, value: 汉`好` };
    const b: OneCorrectPairQuestionChoice = {
      kind: `pinyin`,
      value: [拼音`hǎo`],
    };
    const answer: OneCorrectPairQuestionAnswer = {
      as: [a],
      bs: [b],
      skill: hanziWordToPinyinTone(`好:good`),
    };

    expect(oneCorrectPairQuestionMistakes(answer, a, b)).toEqual([]);
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
      expect(oneCorrectPairQuestionMistakes(answer, a, b)).toEqual([mistake]);
    }
  });

  test(`hanzi↔pinyin / pinyin↔hanzi incorrect`, async () => {
    const answer = { as: [], bs: [], skill: hanziWordToGloss(`好:good`) };
    const choice1 = { kind: `hanzi`, value: 汉`好` } as const;
    const choice2 = { kind: `pinyin`, value: [拼音`hǎo`] } as const;
    const combinations = [
      [choice1, choice2],
      [choice2, choice1],
    ] as const;
    const mistake = {
      kind: MistakeKind.HanziPinyin,
      hanziOrHanziWord: `好`,
      pinyin: [`hǎo`],
    };

    for (const [a, b] of combinations) {
      expect(oneCorrectPairQuestionMistakes(answer, a, b)).toEqual([mistake]);
    }
  });
});
