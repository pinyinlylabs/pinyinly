import {
  addToQuizContext,
  hanziWordToGlossQuestionOrThrow,
  makeQuizContext,
  shouldOmitHanziWord,
} from "#data/questions/hanziWordToGloss.ts";
import { hanziWordToGloss } from "#data/skills.ts";
import { loadDictionary, lookupHanziWord } from "#dictionary/dictionary.ts";
import { describe, expect, test } from "vitest";

describe(
  `shouldOmitHanziWord suite` satisfies HasNameOf<typeof shouldOmitHanziWord>,
  async () => {
    test(`should omit if there is no dictionary item`, async () => {
      const ctx = await makeQuizContext();

      // not in dictionary
      expect(await shouldOmitHanziWord(`我:mock`, ctx)).toEqual(true);
      // is in dictionary
      expect(await shouldOmitHanziWord(`我:i`, ctx)).toEqual(false);
    });

    test(`should omit if there is a conflicting gloss`, async () => {
      const ctx = await makeQuizContext();
      ctx.usedGlosses.add(`me`);

      expect(await shouldOmitHanziWord(`我:i`, ctx)).toEqual(true);
    });

    test(`should omit if there is a conflicting hanzi`, async () => {
      const ctx = await makeQuizContext();
      ctx.usedHanzi.add(`我`);

      expect(await shouldOmitHanziWord(`我:i`, ctx)).toEqual(true);
    });

    test(`should not omit if there is no conflict`, async () => {
      const ctx = await makeQuizContext();

      await addToQuizContext(`丨:line`, ctx);
      expect(await shouldOmitHanziWord(`我:i`, ctx)).toEqual(false);
    });
  },
);

describe(
  `addToQuizContext suite` satisfies HasNameOf<typeof addToQuizContext>,
  async () => {
    test(`adds to used glosses`, async () => {
      const ctx = await makeQuizContext();

      await addToQuizContext(`我:i`, ctx);
      const meaning = await lookupHanziWord(`我:i`);

      expect(ctx.usedGlosses).toEqual(new Set(meaning?.gloss));
    });

    test(`adds to used hanzi`, async () => {
      const ctx = await makeQuizContext();

      await addToQuizContext(`我:i`, ctx);

      expect(ctx.usedHanzi).toEqual(new Set([`我`]));
    });

    test(`adds to final result`, async () => {
      const ctx = await makeQuizContext();
      const hanziWord = `我:i`;
      const hanziWordMeaning = await lookupHanziWord(`我:i`);

      await addToQuizContext(hanziWord, ctx);

      expect(ctx.result).toEqual([[hanziWord, hanziWordMeaning]]);
    });
  },
);

describe(
  `hanziWordToGlossQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToGlossQuestionOrThrow
  >,
  async () => {
    test(`works for the entire dictionary`, async () => {
      const dictionary = await loadDictionary();

      for (const [hanziWord] of dictionary) {
        const skill = hanziWordToGloss(hanziWord);
        await hanziWordToGlossQuestionOrThrow(skill);
      }
    });
  },
);
