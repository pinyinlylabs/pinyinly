import { isHanziChar } from "#data/hanzi.ts";
import {
  hanziWordToPinyinInitialQuestionOrThrow,
  makeQuestionContext,
  tryHanziDistractor,
  tryPinyinDistractor,
} from "#data/questions/hanziWordToPinyinInitial.ts";
import { hanziWordToPinyinInitial } from "#data/skills.ts";
import { hanziFromHanziWord, loadDictionary } from "#dictionary/dictionary.ts";
import assert from "node:assert/strict";
import { describe, expect, test } from "vitest";
import { 拼音, 汉字 } from "../helpers";

describe(`${tryHanziDistractor.name} suite`, async () => {
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
});

describe(`${tryPinyinDistractor.name} suite`, async () => {
  test(`should omit if it is the same`, async () => {
    const ctx = await makeQuestionContext(`我:i`);
    // wǒ conflicts with wǒ
    assert.equal(tryPinyinDistractor(ctx, 拼音`wǒ`), false);
  });

  test(`should omit if the final differs`, async () => {
    const ctx = await makeQuestionContext(`我:i`);

    // u doesn't match o
    assert.equal(tryPinyinDistractor(ctx, 拼音`tǔ`), false);
  });

  test(`should omit if the tone differs`, async () => {
    const ctx = await makeQuestionContext(`我:i`);

    // ō doesn't match ǒ
    assert.equal(tryPinyinDistractor(ctx, 拼音`ō`), false);
  });

  test(`should add viable candidates`, async () => {
    const ctx = await makeQuestionContext(`我:i`);
    expect(ctx.usedPinyin).toEqual(new Set([`wǒ`]));

    assert.equal(tryPinyinDistractor(ctx, 拼音`bǒ`), true);
    expect(ctx.pinyinDistractors).toEqual([`bǒ`]);
    expect(ctx.usedPinyin).toEqual(new Set([`bǒ`, `wǒ`]));
  });
});

describe(`${hanziWordToPinyinInitialQuestionOrThrow.name} suite`, async () => {
  test(`works for all valid single character hanzi`, async () => {
    const dictionary = await loadDictionary();
    const sample = [...dictionary].filter(
      ([hanziWord, meaning]) =>
        isHanziChar(hanziFromHanziWord(hanziWord)) && meaning.pinyin != null,
    );

    for (const [hanziWord] of sample) {
      const skill = hanziWordToPinyinInitial(hanziWord);
      await hanziWordToPinyinInitialQuestionOrThrow(skill);
    }
  });
});
