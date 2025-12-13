// pyly-not-src-test

import type { HanziWordMeaning } from "#dictionary.js";
import {
  buildHanziWord,
  hanziFromHanziWord,
  loadDictionary,
  loadHsk1HanziWords,
  loadHsk2HanziWords,
  loadHsk3HanziWords,
} from "#dictionary.js";
import { IS_CI } from "#util/env.js";
import { toCamelCase } from "#util/unicode.js";
import { nonNullable } from "@pinyinly/lib/invariant";
import { expect, test } from "vitest";
import {
  readDictionary,
  upsertHanziWordMeaning,
  upsertHanziWordWordList,
  writeDictionary,
} from "../helpers.ts";
import { loadCompleteHskVocabulary } from "./completeHskVocabulary.ts";

test(`hsk word lists match vendor data`, async () => {
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

  for (const [wordListFileBaseName, vendorList, localList] of [
    [`hsk1HanziWords`, vendorHsk1Items, hsk1HanziWords],
    [`hsk2HanziWords`, vendorHsk2Items, hsk2HanziWords],
    [`hsk3HanziWords`, vendorHsk3Items, hsk3HanziWords],
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
          `${wordListFileBaseName} local hanzi ${localHanzi} missing from vendor data`,
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
          `${wordListFileBaseName} vendor hanzi ${vendorHanzi} missing from local data`,
        )
        .toBe(true);

      const dictionaryItems = dictionary.lookupHanzi(vendorHanzi);
      const isInDictionary = dictionaryItems.length > 0;
      expect
        .soft(
          isInDictionary,
          `${wordListFileBaseName} vendor hanzi ${vendorHanzi} missing from dictionary`,
        )
        .toBe(true);

      if (isInDictionary) {
        for (const [hanziWord] of dictionaryItems) {
          await upsertHanziWordWordList(hanziWord, wordListFileBaseName);
        }
      } else {
        const hasOneMeaning = vendorItem.forms.length === 1;
        expect
          .soft(
            hasOneMeaning,
            `${wordListFileBaseName} ${vendorHanzi} has multiple meanings in vendor data`,
          )
          .toBe(true);

        if (hasOneMeaning) {
          const form = vendorItem.forms[0]!;

          const newDictionaryMeaningKey = toCamelCase(
            nonNullable(form.meanings[0]),
          );

          const newHanziWord = buildHanziWord(
            vendorHanzi,
            newDictionaryMeaningKey,
          );
          const newDictionaryMeaning: HanziWordMeaning = {
            gloss: form.meanings,
            pinyin: [form.transcriptions.pinyin],
          };

          if (!IS_CI) {
            const dict = await readDictionary();
            upsertHanziWordMeaning(dict, newHanziWord, newDictionaryMeaning);
            await writeDictionary(dict);
          }
        }
      }
    }
  }
});
