// pyly-not-src-test

import { normalizePinyinText } from "#data/pinyin.js";
import type { HanziWordMeaning, partOfSpeechSchema } from "#dictionary.js";
import {
  buildHanziWord,
  hanziFromHanziWord,
  loadDictionary,
  loadHsk1HanziWords,
  loadHsk2HanziWords,
  loadHsk3HanziWords,
  loadHsk4HanziWords,
} from "#dictionary.js";
import { IS_CI } from "#util/env.js";
import { toCamelCase } from "#util/unicode.js";
import { nonNullable } from "@pinyinly/lib/invariant";
import { expect, test } from "vitest";
import type z from "zod/v4";
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
  const vendorHsk4Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-4`),
  );

  const hsk1HanziWords = await loadHsk1HanziWords();
  const hsk2HanziWords = await loadHsk2HanziWords();
  const hsk3HanziWords = await loadHsk3HanziWords();
  const hsk4HanziWords = await loadHsk4HanziWords();

  for (const [wordListFileBaseName, vendorList, localList] of [
    [`hsk1HanziWords`, vendorHsk1Items, hsk1HanziWords],
    [`hsk2HanziWords`, vendorHsk2Items, hsk2HanziWords],
    [`hsk3HanziWords`, vendorHsk3Items, hsk3HanziWords],
    [`hsk4HanziWords`, vendorHsk4Items, hsk4HanziWords],
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

      const disambiguationHints: [
        hanzi: string,
        formIndex: number,
        meaningKey: string,
        primaryGloss?: string,
        pos?: string,
      ][] = [
        [`老公`, 0, `husband`, `husband`],
        [`獲`, 0, `obtain`, `to obtain`],
        [`冲`, 1, `rush`, `to rush`],
        [`刺`, 1, `thorn`, `thorn`, `noun`],
        [`刺`, 1, `stab`, `to stab`, `verb`],
        [`诗`, 1, `poem`],
        [`大爷`, 1, `uncle`, `father's older brother`],
        [`尽快`, 0, `asap`, `ASAP`],
        [`粗`, 0, `coarse`, undefined, `adjective`],
        [`大方`, 1, `generous`],
        [`冰`, 0, `ice`],
        [`网络`, 1, `network`],
        [`土地`, 0, `land`],
        [`大陆`, 1, `mainland`],
        [`伙`, 1, `partner`, undefined, `noun`],
        [`局`, 1, `office`, undefined, `noun`],
        [`针`, 0, `needle`, `needle`, `noun`],
        [`却`, 1, `but`],
        [`辣`, 1, `spicy`, undefined, `adjective`],
        [`尺`, 1, `ruler`, `ruler`, `noun`],
        [`树林`, 1, `woods`],
        [`浅`, 1, `shallow`, undefined, `adjective`],
        [`孙子`, 1, `grandson`, undefined, `noun`],
        [`薄`, 1, `thin`],
        [`戴`, 1, `toWear`, `to wear`],
        [`盖`, 1, `lid`, `lid`, `noun`],
        [`盖`, 1, `cover`, `to cover`, `verb`],
        [`官`, 1, `official`],
        [`归`, 1, `toReturn`],
        [`季`, 1, `season`, undefined, `noun`],
        [`江`, 1, `river`],
        [`宽`, 1, `wide`],
        [`密`, 1, `dense`, undefined, `adjective`],
        [`闪`, 1, `toFlash`],
        [`帅`, 1, `handsome`, `handsome`, `adjective`],
        [`松`, 2, `loose`, undefined, `adjective`],
        [`咸`, 2, `salty`],
        [`项`, 1, `item`, `item`, `noun`],
        [`严`, 1, `strict`, undefined, `adjective`],
        [`摇`, 1, `toShake`],
        [`遇`, 1, `toMeet`],
        [`刷`, 0, `toBrush`, undefined, `verb`],
        [`挑`, 0, `toChoose`],
        [`倒车`, 0, `transfer`, undefined, `verb`],
        [`倒车`, 1, `reverse`, undefined, `verb`],
        [`圈`, 2, `circle`, undefined, `noun`],
        [`圈`, 2, `surround`, undefined, `verb`],
        [`降`, 0, `fall`],
        [`摸`, 0, `feel`],
        [`汇`, 0, `remit`, undefined, `verb`],
        [`汇报`, 0, `report`, undefined, `verb`],
        [`卷`, 0, `roll`, `to roll up`, `verb`],
        [`卷`, 1, `chapter`, `chapter`, `noun`],
        [`折`, 2, `break`, undefined, `verb`],
        [`扫`, 0, `sweep`],
        [`翻`, 0, `flip`],
        [`转动`, 1, `rotate`, `to rotate`, `verb`],
        [`了解`, 0, `understand`, undefined, `verb`],
        [`俩`, 0, `two`, `two`],
        [`伞`, 0, `umbrella`],
        [`晒`, 1, `dry`, `to sun`, `verb`],
        [`阳台`, 1, `balcony`],
        [`暗`, 1, `dark`, undefined, `adjective`],
        [`宝`, 1, `treasure`, `treasure`, `noun`],
        [`宝`, 1, `precious`, `precious`, `adjective`],
        [`湿`, 1, `wet`, undefined, `adjective`],
        [`恶心`, 1, `gross`, `disgusting`, `adjective`],
        [`闹`, 1, `noisy`, `noisy`, `adjective`],
        [`闹`, 1, `disturb`, `to make noise`, `verb`],
        [`获`, 0, `catch`],
        [`收获`, 1, `harvest`, undefined, `verb`],
        [`鲜`, 2, `fresh`, undefined, `adjective`],
        [`词汇`, 1, `vocabulary`],
        [`大众`, 1, `people`, undefined, `noun`],
        [`妻子`, 1, `wife`],
        [`延长`, 1, `prolong`, undefined, `verb`],
        [`资源`, 1, `resources`],
        [`人家`, 0, `family`, undefined, `noun`],
      ];

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
            const meaningsList = vendorItem.forms
              .map((f) => f.meanings.join(`, `))
              .join(` | `);
            expect
              .soft(
                hasOneMeaning ||
                  disambiguationHints.some((item) => item[0] === vendorHanzi),
                `${wordListFileBaseName} ${vendorHanzi} has multiple meanings and no disambiguation override: [${meaningsList}]`,
              )
              .toBe(true);

            if (hasOneMeaning) {
              const form = vendorItem.forms[0]!;

              // Take only the first part of the meaning before semicolon/comma
              // and remove any parenthetical content and non-alphabetic chars
              const firstMeaning = nonNullable(form.meanings[0])
                .split(/[;,]/)[0]!
                .replaceAll(/\([^)]*\)/g, ``)
                .replaceAll(/[^a-zA-Z\s]/g, ``)
                .trim();

              // Shorten meaning keys while keeping essential meaning
              // These only need to be unique within the hanzi namespace
              const words = firstMeaning.split(/\s+/);

              // Remove leading "to" if there are other words after it
              if (words.length > 1 && words[0]?.toLowerCase() === `to`) {
                words.shift();
              }

              // Filter out filler words
              const meaningfulWords = words.filter(
                (w) =>
                  ![
                    `a`,
                    `an`,
                    `the`,
                    `of`,
                    `to`,
                    `be`,
                    `one`,
                    `ones`,
                    `sth`,
                    `sb`,
                  ].includes(w.toLowerCase()),
              );

              // For compound descriptions (3+ words), prefer taking the core noun (last word)
              // For shorter phrases, keep up to 2 words for context
              const shortenedMeaning =
                meaningfulWords.length >= 3
                  ? meaningfulWords.slice(-1).join(` `) // Take last word as core meaning
                  : meaningfulWords.slice(0, 2).join(` `); // Take first 2 words

              const newDictionaryMeaningKey = toCamelCase(shortenedMeaning);

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
            } else {
              // multiple meanings, check the hints
              for (const item of disambiguationHints) {
                const [
                  hanzi,
                  formIndex,
                  meaningKey,
                  primaryGloss,
                  explicitPos,
                ] = item;
                if (hanzi === vendorHanzi) {
                  const form = vendorItem.forms[formIndex]!;
                  const vendorPos = vendorItem.pos.filter((p) => p !== `nr`);

                  if (explicitPos == null && vendorPos.length !== 1) {
                    expect
                      .soft(
                        false,
                        `${vendorHanzi} has ambiguous POS, define pos`,
                      )
                      .toBe(true);
                    continue;
                  }

                  const newHanziWord = buildHanziWord(vendorHanzi, meaningKey);

                  function parsePos(
                    posText: string,
                  ): z.infer<typeof partOfSpeechSchema> | undefined {
                    switch (posText) {
                      case `n`: {
                        return `noun`;
                      }
                      case `v`: {
                        return `verb`;
                      }
                      case `a`: {
                        return `adjective`;
                      }
                      case `d`: {
                        return `adverb`;
                      }
                      case `m`: {
                        return `numeral`;
                      }
                      default: {
                        return undefined;
                      }
                    }
                  }

                  const newPos =
                    (explicitPos as
                      | z.infer<typeof partOfSpeechSchema>
                      | undefined) ?? parsePos(vendorPos[0]!);
                  if (newPos == null) {
                    expect
                      .soft(
                        false,
                        `unable to determine part of speech for ${vendorHanzi} (${vendorItem.pos[0]!})`,
                      )
                      .toBe(true);
                    continue;
                  }
                  const newDictionaryMeaning: HanziWordMeaning = {
                    gloss:
                      primaryGloss == null
                        ? form.meanings
                        : [primaryGloss, ...form.meanings],
                    pinyin: [form.transcriptions.pinyin],
                    partOfSpeech: newPos,
                  };

                  const dict = await readDictionary();
                  upsertHanziWordMeaning(
                    dict,
                    newHanziWord,
                    newDictionaryMeaning,
                  );
                  await writeDictionary(dict);
                }
              }
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
