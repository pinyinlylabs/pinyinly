// pyly-not-src-test

import { normalizePinyinText } from "#data/pinyin.js";
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

    // Make sure every item in the vendor list is in the local list.
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

      // Make sure the pinyin matches
      const vendorPinyins = vendorItem.forms.map((form) =>
        // The dataset mixes diacritic with numeric form pinyin, but our
        // dictionary only uses diacritic form.
        normalizePinyinText(form.transcriptions.pinyin),
      );

      const vendorDataWithWrongPinyin = new Set([
        `那里`,
        `关系`,
        `起来`,
        `便宜`,
        `好处`,
        `不客气`,
        `值得`,
        `先生`,
        `刚刚`,
        `别人`,
        `力量`,
        `有空儿`,
        `西方`,
      ]);

      for (const [hanziWord, meaning] of dictionaryItems) {
        if (vendorDataWithWrongPinyin.has(vendorHanzi)) {
          continue;
        }

        const hasAnyPinyinOverlap = meaning.pinyin?.some((pinyin) =>
          vendorPinyins.includes(pinyin),
        );

        expect
          .soft(
            hasAnyPinyinOverlap,
            `${hanziWord} pinyin ${meaning.pinyin} missing from vendor data`,
          )
          .toBe(true);

        // Auto-update the dictionary
        if (
          !IS_CI &&
          hasAnyPinyinOverlap !== true &&
          vendorPinyins.length === 1
        ) {
          const dict = await readDictionary();
          const meaning = dict.get(hanziWord);
          if (meaning != null) {
            meaning.pinyin = vendorPinyins;
            await writeDictionary(dict);
          }
        }
      }

      // Try to add it to the local list if it's missing.
      if (!isInLocalWordList) {
        const isInDictionary = dictionaryItems.length > 0;
        expect
          .soft(
            isInDictionary,
            `${wordListFileBaseName} vendor hanzi ${vendorHanzi} missing from dictionary`,
          )
          .toBe(true);

        // Autofix the local data in development.
        if (!IS_CI) {
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

              const dict = await readDictionary();
              upsertHanziWordMeaning(dict, newHanziWord, newDictionaryMeaning);
              await writeDictionary(dict);
            }
          }
        }
      }
    }

    // Make sure there's no extra items in the local list that shouldn't be there.
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
  }
});
