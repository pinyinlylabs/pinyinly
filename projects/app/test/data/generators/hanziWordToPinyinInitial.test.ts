import {
  hanziWordToPinyinInitialQuestionOrThrow,
  makeQuestionContext,
  tryHanziDistractor,
  tryPinyinDistractor,
} from "#data/generators/hanziWordToPinyinInitial.ts";
import { hanziWordToPinyinInitial } from "#data/skills.ts";
import {
  characterCount,
  hanziFromHanziWord,
  loadDictionary,
} from "#dictionary/dictionary.ts";
import shuffle from "lodash/shuffle";
import assert from "node:assert/strict";
import test from "node:test";

await test(`${tryHanziDistractor.name} suite`, async () => {
  await test(`should omit if there is a conflicting pinyin`, async () => {
    {
      const ctx = await makeQuestionContext(`我:i`);
      // wǒ doesn't conflict with yī
      assert.equal(await tryHanziDistractor(ctx, `医`), true);
    }

    {
      const ctx = await makeQuestionContext(`一:one`);
      // Both are yī
      assert.equal(await tryHanziDistractor(ctx, `医`), false);
    }
  });

  await test(`should omit if an alternative pinyin conflicts`, async () => {
    const ctx = await makeQuestionContext(`后:behind`); // hòu
    // 候:wait has "hou","hòu". it should be excluded because hòu conflicts
    assert.equal(await tryHanziDistractor(ctx, `候`), false);
  });

  await test(`should not omit if initial is the same`, async () => {
    const ctx = await makeQuestionContext(`我:i`);
    // 武 (wǔ) should not be omitted because it has no exact pinyin conflict
    assert.equal(await tryHanziDistractor(ctx, `武`), true);
  });

  await test(`should omit if not the same length as the correct answer`, async () => {
    const ctx = await makeQuestionContext(`一:one`);

    // 1 word vs 2 words
    assert.equal(await tryHanziDistractor(ctx, `北方`), false);
  });

  await test(`should omit if there is a conflicting hanzi`, async () => {
    const ctx = await makeQuestionContext(`上:above`);

    assert.equal(await tryHanziDistractor(ctx, `上`), false);
  });

  await test(`should not omit if there is no conflict`, async () => {
    {
      const ctx = await makeQuestionContext(`一:one`);
      assert.equal(await tryHanziDistractor(ctx, `我`), true);
    }
    {
      const ctx = await makeQuestionContext(`争:compete`);
      assert.equal(await tryHanziDistractor(ctx, `我`), true);
    }
  });
});

await test(`${tryPinyinDistractor.name} suite`, async () => {
  await test(`should omit if it is the same`, async () => {
    const ctx = await makeQuestionContext(`我:i`);
    // wǒ conflicts with wǒ
    assert.equal(tryPinyinDistractor(ctx, `wǒ`), false);
  });

  await test(`should omit if the final differs`, async () => {
    const ctx = await makeQuestionContext(`我:i`);

    // u doesn't match o
    assert.equal(tryPinyinDistractor(ctx, `tǔ`), false);
  });

  await test(`should omit if the tone differs`, async () => {
    const ctx = await makeQuestionContext(`我:i`);

    // ō doesn't match ǒ
    assert.equal(tryPinyinDistractor(ctx, `tō`), false);
  });

  await test(`should add viable candidates`, async () => {
    const ctx = await makeQuestionContext(`我:i`);
    expect(ctx.usedPinyin).toEqual(new Set([`wǒ`]));

    assert.equal(tryPinyinDistractor(ctx, `bǒ`), true);
    expect(ctx.pinyinDistractors).toEqual([`bǒ`]);
    expect(ctx.usedPinyin).toEqual(new Set([`bǒ`, `wǒ`]));
  });
});

await test(`${hanziWordToPinyinInitialQuestionOrThrow.name} suite`, async () => {
  await test(`randomly generate 100 questions`, async () => {
    const dictionary = await loadDictionary();
    const sample = shuffle([...dictionary])
      .filter(
        ([hanziWord, meaning]) =>
          characterCount(hanziFromHanziWord(hanziWord)) === 1 &&
          meaning.pinyin != null,
      )
      .slice(0, 100);

    for (const [hanziWord] of sample) {
      const skill = hanziWordToPinyinInitial(hanziWord);
      await hanziWordToPinyinInitialQuestionOrThrow(skill);
    }
  });
});
