import {
  addToContext,
  makeQuestionContext,
  shouldOmitHanziWord,
} from "#data/hanziWordToPinyinGenerator.ts";
import { lookupHanziWord } from "#dictionary/dictionary.ts";
import assert from "node:assert/strict";
import test from "node:test";

await test(`${shouldOmitHanziWord.name} suite`, async () => {
  await test(`should omit if there is no dictionary item`, async () => {
    const ctx = await makeQuestionContext(`一:one`);

    // not in dictionary
    assert.equal(await shouldOmitHanziWord(ctx, `我:mock`), true);
    // is in dictionary
    assert.equal(await shouldOmitHanziWord(ctx, `我:i`), false);
  });

  await test(`should omit if there is a conflicting pinyin`, async () => {
    const ctx = await makeQuestionContext(`一:one`);

    // Both are yī
    assert.equal(await shouldOmitHanziWord(ctx, `医:medicine`), true);
  });

  await test(`should omit if not the same length as the correct answer`, async () => {
    const ctx = await makeQuestionContext(`一:one`);

    // 1 word vs 2 words
    assert.equal(await shouldOmitHanziWord(ctx, `北方:north`), true);
  });

  await test(`should omit if there is a conflicting hanzi`, async () => {
    const ctx = await makeQuestionContext(`上:above`);

    assert.equal(await shouldOmitHanziWord(ctx, `上:on`), true);
  });

  await test(`should not omit if there is no conflict`, async () => {
    const ctx = await makeQuestionContext(`一:one`);

    await addToContext(ctx, `丨:line`);
    assert.equal(await shouldOmitHanziWord(ctx, `我:i`), false);
  });
});

await test(`${addToContext.name} suite`, async () => {
  await test(`adds to used hanzi`, async () => {
    const ctx = await makeQuestionContext(`一:one`);
    assert.deepEqual(ctx.usedPinyin, new Set([`yī`]));

    await addToContext(ctx, `我:i`);
    assert.deepEqual(ctx.usedPinyin, new Set([`yī`, `wǒ`]));
  });

  await test(`adds to used hanzi`, async () => {
    const ctx = await makeQuestionContext(`一:one`);
    assert.deepEqual(ctx.usedHanzi, new Set([`一`]));

    await addToContext(ctx, `我:i`);
    assert.deepEqual(ctx.usedHanzi, new Set([`一`, `我`]));
  });

  await test(`adds to distractors`, async () => {
    const ctx = await makeQuestionContext(`一:one`);
    assert.deepEqual(ctx.distractors, []);

    const hanziWord = `我:i`;
    const hanziWordMeaning = await lookupHanziWord(`我:i`);
    await addToContext(ctx, hanziWord);

    assert.deepEqual(ctx.distractors, [[hanziWord, hanziWordMeaning]]);
  });
});
