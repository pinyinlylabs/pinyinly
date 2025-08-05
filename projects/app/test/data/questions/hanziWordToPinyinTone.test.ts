import { isHanziGrapheme } from "#data/hanzi.ts";
import {
  hanziWordToPinyinToneQuestionOrThrow,
  makeQuestionContext,
  tryHanziDistractor,
  tryPinyinDistractor,
} from "#data/questions/hanziWordToPinyinTone.ts";
import { hanziWordToPinyinTone } from "#data/skills.ts";
import { hanziFromHanziWord, loadDictionary } from "#dictionary/dictionary.ts";
import assert from "node:assert/strict";
import { describe, expect, test } from "vitest";
import { 拼音, 汉字 } from "../helpers.ts";

describe(
  `tryHanziDistractor suite` satisfies HasNameOf<typeof tryHanziDistractor>,
  async () => {
    test(`should omit if there is a conflicting pinyin`, async () => {
      {
        const ctx = await makeQuestionContext(`我:i`);
        // wǒ doesn't conflict with yī
        assert.equal(await tryHanziDistractor(ctx, 汉字`医`), true);
      }

      {
        const ctx = await makeQuestionContext(`一:one`);
        // Both are yī
        assert.equal(await tryHanziDistractor(ctx, 汉字`医`), false);
      }
    });

    test(`should omit if an alternative pinyin conflicts`, async () => {
      const ctx = await makeQuestionContext(`后:behind`); // hòu

      // 候:wait has "hou","hòu". it should be excluded because hòu conflicts
      assert.equal(await tryHanziDistractor(ctx, 汉字`候`), false);
    });

    test(`should not omit if initial is the same`, async () => {
      const ctx = await makeQuestionContext(`我:i`);
      // 武 (wǔ) should not be omitted because it has no exact pinyin conflict
      assert.equal(await tryHanziDistractor(ctx, 汉字`武`), true);
    });

    test(`should omit if there is a conflicting hanzi`, async () => {
      const ctx = await makeQuestionContext(`上:above`);

      assert.equal(await tryHanziDistractor(ctx, 汉字`上`), false);
    });

    test(`should not omit if there is no conflict`, async () => {
      {
        const ctx = await makeQuestionContext(`一:one`);
        assert.equal(await tryHanziDistractor(ctx, 汉字`我`), true);
      }
      {
        const ctx = await makeQuestionContext(`争:compete`);
        assert.equal(await tryHanziDistractor(ctx, 汉字`我`), true);
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
      assert.equal(tryPinyinDistractor(ctx, 拼音`wǒ`), false);
    });

    test(`should add viable candidates`, async () => {
      const ctx = await makeQuestionContext(`我:i`);
      expect(ctx.usedPinyin).toEqual(new Set([`wǒ`]));

      assert.equal(tryPinyinDistractor(ctx, 拼音`wǔ`), true);
      expect(ctx.pinyinDistractors).toEqual([`wǔ`]);
      expect(ctx.usedPinyin).toEqual(new Set([`wǔ`, `wǒ`]));
    });

    test(`should reject conflicts with pinyin of another meaning of the same hanzi`, async () => {
      // 为:become is wéi but 为:for is wèi. So the question for 为:become should
      // omit wèi entirely, because even though it's a correct answer it's not the
      // focus of what's being tested (this is a HanziWord test not a Hanzi test).
      const ctx = await makeQuestionContext(`为:become`); // wéi
      expect(ctx.usedPinyin).toEqual(
        new Set([
          `wéi`, // via 为:become
          `wèi`, // via 为:for
        ]),
      );
      expect(ctx.pinyinAnswers).toEqual([`wéi`]);

      assert.equal(tryPinyinDistractor(ctx, 拼音`wèi`), false);
      expect(ctx.pinyinDistractors).toEqual([]);
    });
  },
);

describe(
  `hanziWordToPinyinToneQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToPinyinToneQuestionOrThrow
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
        const skill = hanziWordToPinyinTone(hanziWord);
        await expect(
          hanziWordToPinyinToneQuestionOrThrow(skill),
        ).resolves.toBeDefined();
      }

      expect.assertions(sample.length);
    });
  },
);
