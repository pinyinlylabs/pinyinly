import { isHanziGrapheme } from "#data/hanzi.ts";
import {
  hanziWordToPinyinInitialQuestionOrThrow,
  makeQuestionContext,
  tryHanziDistractor,
  tryPinyinDistractor,
} from "#data/questions/hanziWordToPinyinInitial.ts";
import { hanziWordToPinyinInitial } from "#data/skills.ts";
import { hanziFromHanziWord, loadDictionary } from "#dictionary/dictionary.ts";
import { describe, expect, test } from "vitest";
import { 拼音, 汉字 } from "../helpers.ts";

describe(
  `tryHanziDistractor suite` satisfies HasNameOf<typeof tryHanziDistractor>,
  async () => {
    test(`should omit if there is a conflicting pinyin`, async () => {
      {
        const ctx = await makeQuestionContext(`我:i`);
        // wǒ doesn't conflict with yī
        expect(await tryHanziDistractor(ctx, 汉字`医`)).toEqual(true);
      }

      {
        const ctx = await makeQuestionContext(`一:one`);
        // Both are yī
        expect(await tryHanziDistractor(ctx, 汉字`医`)).toEqual(false);
      }
    });

    test(`should omit if an alternative pinyin conflicts`, async () => {
      const ctx = await makeQuestionContext(`后:behind`); // hòu
      // 候:wait has "hou","hòu". it should be excluded because hòu conflicts
      expect(await tryHanziDistractor(ctx, 汉字`候`)).toEqual(false);
    });

    test(`should not omit if initial is the same`, async () => {
      const ctx = await makeQuestionContext(`我:i`);
      // 武 (wǔ) should not be omitted because it has no exact pinyin conflict
      expect(await tryHanziDistractor(ctx, 汉字`武`)).toEqual(true);
    });

    test(`should omit if there is a conflicting hanzi`, async () => {
      const ctx = await makeQuestionContext(`上:above`);

      expect(await tryHanziDistractor(ctx, 汉字`上`)).toEqual(false);
    });

    test(`should not omit if there is no conflict`, async () => {
      {
        const ctx = await makeQuestionContext(`一:one`);
        expect(await tryHanziDistractor(ctx, 汉字`我`)).toEqual(true);
      }
      {
        const ctx = await makeQuestionContext(`争:compete`);
        expect(await tryHanziDistractor(ctx, 汉字`我`)).toEqual(true);
      }
    });
  },
);

describe(
  `tryPinyinDistractor suite` satisfies HasNameOf<typeof tryPinyinDistractor>,
  async () => {
    test(`should omit if it is the same`, async () => {
      const ctx = await makeQuestionContext(`我:i`);
      // wǒ conflicts with wǒ
      expect(tryPinyinDistractor(ctx, 拼音`wǒ`)).toEqual(false);
    });

    test(`should omit if the final differs`, async () => {
      const ctx = await makeQuestionContext(`我:i`);

      // u doesn't match o
      expect(tryPinyinDistractor(ctx, 拼音`tǔ`)).toEqual(false);
    });

    test(`should omit if the tone differs`, async () => {
      const ctx = await makeQuestionContext(`我:i`);

      // ō doesn't match ǒ
      expect(tryPinyinDistractor(ctx, 拼音`ō`)).toEqual(false);
    });

    test(`should add viable candidates`, async () => {
      const ctx = await makeQuestionContext(`我:i`);
      expect(ctx.usedPinyin).toEqual(new Set([`wǒ`]));

      expect(tryPinyinDistractor(ctx, 拼音`bǒ`)).toEqual(true);
      expect(ctx.pinyinDistractors).toEqual([`bǒ`]);
      expect(ctx.usedPinyin).toEqual(new Set([`bǒ`, `wǒ`]));
    });
  },
);

describe(
  `hanziWordToPinyinInitialQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToPinyinInitialQuestionOrThrow
  >,
  async () => {
    test(`works for all valid single grapheme hanzi`, async () => {
      const dictionary = await loadDictionary();
      const sample = [...dictionary].filter(
        ([hanziWord, meaning]) =>
          isHanziGrapheme(hanziFromHanziWord(hanziWord)) &&
          meaning.pinyin != null,
      );

      for (const [hanziWord] of sample) {
        const skill = hanziWordToPinyinInitial(hanziWord);
        await hanziWordToPinyinInitialQuestionOrThrow(skill);
      }
    });
  },
);
