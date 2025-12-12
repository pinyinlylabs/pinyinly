// pyly-not-src-test

import {
  hanziFromHanziWord,
  loadDictionary,
  loadHsk1HanziWords,
  loadHsk2HanziWords,
  loadHsk3HanziWords,
} from "#dictionary.js";
import { expect, test } from "vitest";
import { loadCompleteHskVocabulary } from "./completeHskVocabulary.ts";

test.skip(`hsk word lists match vendor data`, async () => {
  const completeHskVocabulary = await loadCompleteHskVocabulary();
  const dictionary = await loadDictionary();

  const vendorHsk1Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-1`),
  );
  const vendorHsk2Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-2`),
  );
  const vendorHsk3Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-3`),
  );

  const hsk1HanziWords = await loadHsk1HanziWords();
  const hsk2HanziWords = await loadHsk2HanziWords();
  const hsk3HanziWords = await loadHsk3HanziWords();

  for (const [label, vendorList, localList] of [
    [`HSK 1`, vendorHsk1Items, hsk1HanziWords],
    [`HSK 2`, vendorHsk2Items, hsk2HanziWords],
    [`HSK 3`, vendorHsk3Items, hsk3HanziWords],
  ] as const) {
    const localHanziList = new Set(
      localList.map((hanziWord) => hanziFromHanziWord(hanziWord)),
    );
    const vendorHanziList = new Set(vendorList.map((item) => item.simplified));

    for (const localHanzi of localHanziList) {
      const isInVendor = vendorHanziList.has(localHanzi);
      expect
        .soft(
          isInVendor,
          `${label} local hanzi ${localHanzi} missing from vendor data`,
        )
        .toBe(true);

      // TODO: remove from the list?
    }

    for (const vendorItem of vendorList) {
      const vendorHanzi = vendorItem.simplified;
      const isInLocalWordList = localHanziList.has(vendorHanzi);
      expect
        .soft(
          isInLocalWordList,
          `${label} vendor hanzi ${vendorHanzi} missing from local data`,
        )
        .toBe(true);

      const isInDictionary = dictionary.lookupHanzi(vendorHanzi).length > 0;
      expect
        .soft(
          isInDictionary,
          `${label} vendor hanzi ${vendorHanzi} missing from dictionary`,
        )
        .toBe(true);

      // if (!isInDictionary) {
      //   const hasOneMeaning = vendorItem.forms.length === 1;
      //   expect
      //     .soft(
      //       hasOneMeaning,
      //       `${label} ${vendorHanzi} has multiple meanings in vendor data`,
      //     )
      //     .toBe(true);

      //   if (hasOneMeaning) {
      //     const form = vendorItem.forms[0]!;

      //     const newDictionaryMeaningKey = ``;
      //     const newDictionaryMeaning: HanziWordMeaning = {
      //       gloss: form.meanings,
      //       pinyin: form.transcriptions.pinyin,
      //     };
      //     console.log(
      //       `Suggested new dictionary meaning for ${vendorHanzi}:`,
      //       newDictionaryMeaning,
      //     );
      //   }
      // }
    }
  }
});
