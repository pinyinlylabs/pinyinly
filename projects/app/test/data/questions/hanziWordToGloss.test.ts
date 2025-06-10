import {
  addToQuizContext,
  hanziWordToGlossQuestionOrThrow,
  makeQuizContext,
  shouldOmitHanziWord,
} from "#data/questions/hanziWordToGloss.ts";
import { hanziWordToGloss } from "#data/skills.ts";
import { loadDictionary, lookupHanziWord } from "#dictionary/dictionary.ts";
import assert from "node:assert/strict";
import test from "node:test";

await test(`${shouldOmitHanziWord.name} suite`, async () => {
  await test(`should omit if there is no dictionary item`, async () => {
    const ctx = await makeQuizContext();

    // not in dictionary
    assert.equal(await shouldOmitHanziWord(`我:mock`, ctx), true);
    // is in dictionary
    assert.equal(await shouldOmitHanziWord(`我:i`, ctx), false);
  });

  await test(`should omit if there is a conflicting gloss`, async () => {
    const ctx = await makeQuizContext();
    ctx.usedGlosses.add(`me`);

    assert.equal(await shouldOmitHanziWord(`我:i`, ctx), true);
  });

  await test(`should omit if there is a conflicting hanzi`, async () => {
    const ctx = await makeQuizContext();
    ctx.usedHanzi.add(`我`);

    assert.equal(await shouldOmitHanziWord(`我:i`, ctx), true);
  });

  await test(`should not omit if there is no conflict`, async () => {
    const ctx = await makeQuizContext();

    await addToQuizContext(`丨:line`, ctx);
    assert.equal(await shouldOmitHanziWord(`我:i`, ctx), false);
  });
});

await test(`${addToQuizContext.name} suite`, async () => {
  await test(`adds to used glosses`, async () => {
    const ctx = await makeQuizContext();

    await addToQuizContext(`我:i`, ctx);
    const meaning = await lookupHanziWord(`我:i`);

    assert.deepEqual(ctx.usedGlosses, new Set(meaning?.gloss));
  });

  await test(`adds to used hanzi`, async () => {
    const ctx = await makeQuizContext();

    await addToQuizContext(`我:i`, ctx);

    assert.deepEqual(ctx.usedHanzi, new Set([`我`]));
  });

  await test(`adds to final result`, async () => {
    const ctx = await makeQuizContext();
    const hanziWord = `我:i`;
    const hanziWordMeaning = await lookupHanziWord(`我:i`);

    await addToQuizContext(hanziWord, ctx);

    assert.deepEqual(ctx.result, [[hanziWord, hanziWordMeaning]]);
  });
});

await test(`${hanziWordToGlossQuestionOrThrow.name} suite`, async () => {
  await test(`works for the entire dictionary`, async () => {
    const dictionary = await loadDictionary();

    for (const [hanziWord] of dictionary) {
      const skill = hanziWordToGloss(hanziWord);
      await hanziWordToGlossQuestionOrThrow(skill);
    }
  });
});
