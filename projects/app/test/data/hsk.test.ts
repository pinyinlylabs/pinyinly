import type { HanziText, partOfSpeechSchema } from "#data/model.js";
import { HskLevel, PartOfSpeech } from "#data/model.js";
import { normalizePinyinText } from "#data/pinyin.js";
import type { HanziWordMeaning } from "#dictionary.js";
import {
  buildHanziWord,
  hanziFromHanziWord,
  loadDictionary,
} from "#dictionary.js";
import {
  dataDir,
  readDictionaryJson,
  upsertHanziWordMeaning,
  writeDictionaryJson,
} from "#test/helpers.ts";
import { isCi } from "#util/env.js";
import { toCamelCase } from "#util/unicode.js";
import { memoize0, memoize1 } from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import { nonNullable } from "@pinyinly/lib/invariant";
import path from "node:path";
import { describe, expect, test } from "vitest";
import type z from "zod/v4";
import { loadCompleteHskVocabulary } from "./completeHskVocabulary.ts";
import { loadIvankraHsk30 } from "./ivankraHsk30.ts";

test.skip(`all ivankraHsk30 items are in the dictionary`, async () => {
  const ivankraHsk30 = await loadIvankraHsk30();
  const dictionary = await loadDictionary();

  for (const hsk30Item of ivankraHsk30) {
    // TODO: do all HSK levels
    if (hsk30Item.level === `1`) {
      continue;
    }

    const results = dictionary.lookupHanzi(hsk30Item.simplified);
    const result = results.find(
      ([, meaning]) => meaning.hsk === hsk30Item.level,
    );
    expect
      .soft(
        result,
        `${hsk30Item.id} (${hsk30Item.simplified}) missing from dictionary`,
      )
      .toBeDefined();
  }
});

test.for([
  [`intersection; crossing`, [`crossing`]],
  [`It’s okay`, [`okay`]],
  [`move; move house`, [`move`]],
  [`security guard; public security; ensure safety`, [`guard`]],
  [`Preservation`, `preservation`],
  [`back of the body; back side of an object`, [`back`]],
  [`The Great Wall`, [`wall`]],
  [`put to use; adopt; use; employ`, [`employ`, `use`, `adopt`]],
  [`become; turn into; change into`, [`turn`, `become`]],
  [`beginning; start; basis; at the beginning of`, [`start`]],
  [`junior high school`, [`high`]],
  [`A literary creation`, [`literary`]],
] as const)(
  `guessMeaningKey fixture: %s → %s` satisfies HasNameOf<
    typeof guessMeaningKey
  >,
  async ([meanings, expectedKeys]) => {
    expect(expectedKeys).toContain(guessMeaningKey(meanings.split(`; `)));
  },
);

test.for([
  [`零`, [`zero`]],
  [`〇`, [`zero`]],
  [`路口`, [`intersection`, `crossing`]],
  [`没什么`, [`It’s nothing`]],
] as const)(
  `guessGlosses fixtures: %s → %s`,
  async ([hanzi, expectedGlosses]) => {
    await expect(guessHanziGlosses(hanzi as HanziText)).resolves.toEqual(
      expectedGlosses,
    );
  },
);

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
  const vendorHsk5Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-5`),
  );
  const vendorHsk6Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-6`),
  );
  const vendorHsk7To9Items = completeHskVocabulary.filter((item) =>
    item.level.includes(`new-7`),
  );

  for (const [hskLevel, vendorList, localList] of [
    [HskLevel[1], vendorHsk1Items, dictionary.hsk1HanziWords],
    [HskLevel[2], vendorHsk2Items, dictionary.hsk2HanziWords],
    [HskLevel[3], vendorHsk3Items, dictionary.hsk3HanziWords],
    [HskLevel[4], vendorHsk4Items, dictionary.hsk4HanziWords],
    [HskLevel[5], vendorHsk5Items, dictionary.hsk5HanziWords],
    [HskLevel[6], vendorHsk6Items, dictionary.hsk6HanziWords],
    [HskLevel[`7-9`], vendorHsk7To9Items, dictionary.hsk7To9HanziWords],
  ] as const) {
    // TODO: Skip HSK 7-9 for now as we don't have local data for it yet.
    if (
      hskLevel === HskLevel[`7-9`] ||
      hskLevel === HskLevel[6] ||
      hskLevel === HskLevel[5]
    ) {
      continue;
    }

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
          `HSK${hskLevel} vendor hanzi ${vendorHanzi} missing from local data`,
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
        pos?: PartOfSpeech,
      ][] = [
        [`老公`, 0, `husband`, `husband`],
        [`獲`, 0, `obtain`, `to obtain`],
        [`冲`, 1, `rush`, `to rush`],
        [`刺`, 1, `thorn`, `thorn`, PartOfSpeech.Noun],
        [`刺`, 1, `stab`, `to stab`, PartOfSpeech.Verb],
        [`诗`, 1, `poem`],
        [`大爷`, 1, `uncle`, `father's older brother`],
        [`尽快`, 0, `asap`, `ASAP`],
        [`粗`, 0, `coarse`, undefined, PartOfSpeech.Adjective],
        [`大方`, 1, `generous`],
        [`冰`, 0, `ice`],
        [`网络`, 1, `network`],
        [`土地`, 0, `land`],
        [`大陆`, 1, `mainland`],
        [`伙`, 1, `partner`, undefined, PartOfSpeech.Noun],
        [`局`, 1, `office`, undefined, PartOfSpeech.Noun],
        [`针`, 0, `needle`, `needle`, PartOfSpeech.Noun],
        [`却`, 1, `but`],
        [`辣`, 1, `spicy`, undefined, PartOfSpeech.Adjective],
        [`尺`, 1, `ruler`, `ruler`, PartOfSpeech.Noun],
        [`树林`, 1, `woods`],
        [`浅`, 1, `shallow`, undefined, PartOfSpeech.Adjective],
        [`孙子`, 1, `grandson`, undefined, PartOfSpeech.Noun],
        [`薄`, 1, `thin`],
        [`戴`, 1, `toWear`, `to wear`],
        [`盖`, 1, `lid`, `lid`, PartOfSpeech.Noun],
        [`盖`, 1, `cover`, `to cover`, PartOfSpeech.Verb],
        [`官`, 1, `official`],
        [`归`, 1, `toReturn`],
        [`季`, 1, `season`, undefined, PartOfSpeech.Noun],
        [`江`, 1, `river`],
        [`宽`, 1, `wide`],
        [`密`, 1, `dense`, undefined, PartOfSpeech.Adjective],
        [`闪`, 1, `toFlash`],
        [`帅`, 1, `handsome`, `handsome`, PartOfSpeech.Adjective],
        [`松`, 2, `loose`, undefined, PartOfSpeech.Adjective],
        [`咸`, 2, `salty`],
        [`项`, 1, `item`, `item`, PartOfSpeech.Noun],
        [`严`, 1, `strict`, undefined, PartOfSpeech.Adjective],
        [`摇`, 1, `toShake`],
        [`遇`, 1, `toMeet`],
        [`刷`, 0, `toBrush`, undefined, PartOfSpeech.Verb],
        [`挑`, 0, `toChoose`],
        [`倒车`, 0, `transfer`, undefined, PartOfSpeech.Verb],
        [`倒车`, 1, `reverse`, undefined, PartOfSpeech.Verb],
        [`圈`, 2, `circle`, undefined, PartOfSpeech.Noun],
        [`圈`, 2, `surround`, undefined, PartOfSpeech.Verb],
        [`降`, 0, `fall`],
        [`摸`, 0, `feel`],
        [`汇`, 0, `remit`, undefined, PartOfSpeech.Verb],
        [`汇报`, 0, `report`, undefined, PartOfSpeech.Verb],
        [`卷`, 0, `roll`, `to roll up`, PartOfSpeech.Verb],
        [`卷`, 1, `chapter`, `chapter`, PartOfSpeech.Noun],
        [`折`, 2, `break`, undefined, PartOfSpeech.Verb],
        [`扫`, 0, `sweep`],
        [`翻`, 0, `flip`],
        [`转动`, 1, `rotate`, `to rotate`, PartOfSpeech.Verb],
        [`了解`, 0, `understand`, undefined, PartOfSpeech.Verb],
        [`俩`, 0, `two`, `two`],
        [`伞`, 0, `umbrella`],
        [`晒`, 1, `dry`, `to sun`, PartOfSpeech.Verb],
        [`阳台`, 1, `balcony`],
        [`暗`, 1, `dark`, undefined, PartOfSpeech.Adjective],
        [`宝`, 1, `treasure`, `treasure`, PartOfSpeech.Noun],
        [`宝`, 1, `precious`, `precious`, PartOfSpeech.Adjective],
        [`湿`, 1, `wet`, undefined, PartOfSpeech.Adjective],
        [`恶心`, 1, `gross`, `disgusting`, PartOfSpeech.Adjective],
        [`闹`, 1, `noisy`, `noisy`, PartOfSpeech.Adjective],
        [`闹`, 1, `disturb`, `to make noise`, PartOfSpeech.Verb],
        [`获`, 0, `catch`],
        [`收获`, 1, `harvest`, undefined, PartOfSpeech.Verb],
        [`鲜`, 2, `fresh`, undefined, PartOfSpeech.Adjective],
        [`词汇`, 1, `vocabulary`],
        [`大众`, 1, `people`, undefined, PartOfSpeech.Noun],
        [`妻子`, 1, `wife`],
        [`延长`, 1, `prolong`, undefined, PartOfSpeech.Verb],
        [`资源`, 1, `resources`],
        [`人家`, 0, `family`, undefined, PartOfSpeech.Noun],
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
          !isCi &&
          hasAnyPinyinOverlap !== true &&
          vendorPinyins.length === 1
        ) {
          const dict = await readDictionaryJson();
          const meaning = dict.get(hanziWord);
          if (meaning != null) {
            meaning.pinyin = vendorPinyins;
            await writeDictionaryJson(dict);
          }
        }
      }

      // Try to add it to the local list if it's missing.
      if (!isInLocalWordList) {
        const isInDictionary = dictionaryItems.length > 0;
        expect
          .soft(
            isInDictionary,
            `HSK${hskLevel} vendor hanzi ${vendorHanzi} missing from dictionary`,
          )
          .toBe(true);

        // Autofix the local data in development.
        if (!isCi) {
          if (isInDictionary) {
            for (const [hanziWord] of dictionaryItems) {
              const dict = await readDictionaryJson();
              upsertHanziWordMeaning(dict, hanziWord, { hsk: hskLevel });
              await writeDictionaryJson(dict);
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
                `${hskLevel} ${vendorHanzi} has multiple meanings and no disambiguation override: [${meaningsList}]`,
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

              const dict = await readDictionaryJson();
              upsertHanziWordMeaning(dict, newHanziWord, newDictionaryMeaning);
              await writeDictionaryJson(dict);
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
                        return PartOfSpeech.Noun;
                      }
                      case `v`: {
                        return PartOfSpeech.Verb;
                      }
                      case `a`: {
                        return PartOfSpeech.Adjective;
                      }
                      case `d`: {
                        return PartOfSpeech.Adverb;
                      }
                      case `m`: {
                        return PartOfSpeech.Numeral;
                      }
                      default: {
                        return undefined;
                      }
                    }
                  }

                  const newPos = explicitPos ?? parsePos(vendorPos[0]!);
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
                    pos: newPos,
                  };

                  const dict = await readDictionaryJson();
                  upsertHanziWordMeaning(
                    dict,
                    newHanziWord,
                    newDictionaryMeaning,
                  );
                  await writeDictionaryJson(dict);
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
          `${hskLevel} local hanzi ${localHanzi} missing from vendor data`,
        )
        .toBe(true);

      // TODO: remove from the list?
    }
  }
}, 120_000);

describe(`parseHskTsv suite` satisfies HasNameOf<typeof parseHskTsv>, () => {
  const loadData = memoize1(async (filename: string) =>
    readFile(path.join(dataDir, filename), `utf8`),
  );

  test(`parses hsk1.tsv correctly`, async () => {
    const tsv = await loadData(`hsk1.tsv`);
    const entries = parseHskTsv(tsv);
    expect(entries.length).toBe(500);
  });
});

describe(
  `parseHskTsvLine suite` satisfies HasNameOf<typeof parseHskTsvLine>,
  () => {
    test.for([
      [
        `489	子（桌子）	zi （ zhuō zi ）	noun suffix (table)`,
        [
          {
            num: 489,
            hanzi: `子`,
            pinyin: `zi`,
            meaning: `noun suffix`,
          },
          {
            num: 489,
            hanzi: `桌子`,
            pinyin: `zhuō zi`,
            meaning: `table`,
          },
        ],
      ],
      [
        `454	再见	zàijiàn	Bye!`,
        [
          {
            num: 454,
            hanzi: `再见`,
            pinyin: `zàijiàn`,
            meaning: `Bye!`,
          },
        ],
      ],
      [
        `340	老（老王）	lǎo （ lǎo wáng ）	noun prefix (Lao Wang)`,
        [
          {
            num: 340,
            hanzi: `老`,
            pinyin: `lǎo`,
            meaning: `noun prefix`,
          },
          {
            num: 340,
            hanzi: `老王`,
            pinyin: `lǎo wáng`,
            meaning: `Lao Wang`,
          },
        ],
      ],
      [
        `216	零｜〇	líng ｜ líng	zero`,
        [
          {
            num: 216,
            hanzi: `零`,
            pinyin: `líng`,
            meaning: `zero`,
          },
          {
            num: 216,
            hanzi: `〇`,
            pinyin: `líng`,
            meaning: `zero`,
          },
        ],
      ],
      [
        `215	两（数）	liǎng	two`,
        [
          {
            num: 215,
            pos: `数`,
            hanzi: `两`,
            pinyin: `liǎng`,
            meaning: `two`,
          },
        ],
      ],
      [
        `231	毛（量）	máo	a fractional unit of money in China (measure word)`,
        [
          {
            num: 231,
            pos: `量`,
            hanzi: `毛`,
            pinyin: `máo`,
            meaning: `a fractional unit of money in China`,
          },
        ],
      ],
      [
        `241	们（朋友们）	men （ péng yǒu men ）	plural marker for pronouns and a few animate nouns (friends)`,
        [
          {
            num: 241,
            hanzi: `们`,
            pinyin: `men`,
            meaning: `plural marker for pronouns and a few animate nouns`,
          },
          {
            num: 241,
            hanzi: `朋友们`,
            pinyin: `péng yǒu men`,
            meaning: `friends`,
          },
        ],
      ],
    ] as const)(`fixture: %s`, async ([input, expected]) => {
      expect(parseHskTsvLine(input)).toMatchObject(expected);
    });
  },
);

function parseHskTsv(tsv: string) {
  const lines = tsv.trim().split(`\n`);
  const entries = lines.slice(1).map((line) => {
    return parseHskTsvLine(line);
  });

  return entries;
}

function parseHskTsvLine(line: string) {
  const [numRaw, hanziRaw, pinyinRaw, meaningRaw] = line.split(`\t`);
  const num = Number.parseInt(numRaw ?? `0`, 10);

  // Split by pipes (both regular | and fullwidth ｜)
  function splitVariants(text: string): string[] {
    return text.split(/[|｜]/).map((s) => s.trim());
  }

  // Extract main and hint from parentheses
  function extractHint(text: string): { main: string; hint?: string } {
    const match = /^([^(（]*)(?:[((（]([^)）]*)[))）])?/.exec(text);
    if (match) {
      const main = match[1]?.trim() ?? text;
      const hint = match[2]?.trim();
      return { main, hint };
    }
    return { main: text.trim(), hint: undefined };
  }

  const results: {
    num: number;
    pos?: string;
    hanzi: string;
    pinyin: string;
    meaning: string;
  }[] = [];

  // Check if there are pipe-separated variants
  const hanziVariants = splitVariants(hanziRaw ?? ``);
  const hasPipes = hanziVariants.length > 1;

  if (hasPipes) {
    // Handle pipe-separated variants
    const pinyinVariants = splitVariants(pinyinRaw ?? ``);

    for (const [i, hanzi] of hanziVariants.entries()) {
      const pinyin = pinyinVariants[i] ?? pinyinVariants[0];

      if (hanzi) {
        results.push({
          num,
          hanzi: hanzi.trim(),
          pinyin: pinyin?.trim() ?? ``,
          meaning: (meaningRaw ?? ``).trim(),
        });
      }
    }
  } else {
    // Handle parentheses (main + hint or pos)
    const { main: hanziMain, hint: hanziHint } = extractHint(hanziRaw ?? ``);
    const { main: pinyinMain, hint: pinyinHint } = extractHint(pinyinRaw ?? ``);
    const { main: meaningMain, hint: meaningHint } = extractHint(
      meaningRaw ?? ``,
    );

    // Check if hanziHint is a single character (part of speech marker)
    const isSingleCharPos = hanziHint != null && hanziHint.length === 1;

    if (isSingleCharPos) {
      // Single character in parens = part of speech
      results.push({
        num,
        pos: hanziHint,
        hanzi: hanziMain,
        pinyin: pinyinMain,
        meaning: meaningMain,
      });
    } else {
      // Add main entry
      results.push({
        num,
        hanzi: hanziMain,
        pinyin: pinyinMain,
        meaning: meaningMain,
      });

      // Add hint entry if all hints exist
      if (hanziHint != null && pinyinHint != null && meaningHint != null) {
        results.push({
          num,
          hanzi: hanziHint,
          pinyin: pinyinHint,
          meaning: meaningHint,
        });
      }
    }
  }

  return results;
}

const allHskFromTsv = memoize0(async () => {
  return [
    ...parseHskTsv(await readFile(path.join(dataDir, `hsk1.tsv`), `utf8`))
      .flat()
      .map((x) => ({ ...x, level: HskLevel[1] })),
    ...parseHskTsv(await readFile(path.join(dataDir, `hsk2.tsv`), `utf8`))
      .flat()
      .map((x) => ({ ...x, level: HskLevel[2] })),
    ...parseHskTsv(await readFile(path.join(dataDir, `hsk3.tsv`), `utf8`))
      .flat()
      .map((x) => ({ ...x, level: HskLevel[3] })),
    ...parseHskTsv(await readFile(path.join(dataDir, `hsk4.tsv`), `utf8`))
      .flat()
      .map((x) => ({ ...x, level: HskLevel[4] })),
    ...parseHskTsv(await readFile(path.join(dataDir, `hsk5.tsv`), `utf8`))
      .flat()
      .map((x) => ({ ...x, level: HskLevel[5] })),
    ...parseHskTsv(await readFile(path.join(dataDir, `hsk6.tsv`), `utf8`))
      .flat()
      .map((x) => ({ ...x, level: HskLevel[6] })),
  ];
});

async function guessHanziGlosses(hanzi: HanziText): Promise<string[] | null> {
  for (const entry of await allHskFromTsv()) {
    if (entry.hanzi === hanzi) {
      return splitTsvMeanings(entry.meaning);
    }
  }
  return null;
}

function splitTsvMeanings(text: string): string[] {
  return text.split(/[;]+\s+/).map((s) => s.trim());
}

function guessMeaningKey(meanings: readonly string[]): string {
  const fillerWords = new Set([
    `a`,
    `an`,
    `the`,
    `of`,
    `to`,
    `be`,
    `is`,
    `are`,
    `in`,
    `on`,
    `at`,
    `for`,
    `with`,
    `from`,
    `it`,
    `its`,
    `one`,
    `ones`,
    `sth`,
    `sb`,
    `or`,
    `and`,
  ]);

  function cleanWord(word: string): string {
    return word
      .toLowerCase()
      .replaceAll(/[’']/g, ``)
      .trim();
  }

  function isFillerWord(word: string): boolean {
    return fillerWords.has(cleanWord(word));
  }

  // First pass: Collect all standalone single-word meanings (not phrases)
  const standaloneSingleWords: string[] = [];
  for (const meaning of meanings) {
    const cleanMeaning = meaning.replaceAll(/\([^)]*\)/g, ``).trim();
    const words = cleanMeaning.split(/\s+/).filter((w) => w.length > 0);

    // If this meaning is a single word and not a filler, collect it
    if (words.length === 1 && !isFillerWord(words[0]!)) {
      standaloneSingleWords.push(cleanWord(words[0]!));
    }
  }

  // If we found standalone single words, return the shortest one
  if (standaloneSingleWords.length > 0) {
    let shortestWord = standaloneSingleWords[0]!;
    for (let i = 1; i < standaloneSingleWords.length; i++) {
      const word = standaloneSingleWords[i]!;
      if (word.length < shortestWord.length) {
        shortestWord = word;
      }
    }
    return toCamelCase(shortestWord);
  }

  // If no standalone words, collect all words from all meanings
  const allWords: string[] = [];
  for (const meaning of meanings) {
    const cleanMeaning = meaning.replaceAll(/\([^)]*\)/g, ``).trim();
    const words = cleanMeaning.split(/\s+/);
    allWords.push(...words);
  }

  const meaningfulWords = allWords
    .filter((word) => word.length > 0)
    .map((x) => cleanWord(x))
    .filter((word) => !fillerWords.has(word));

  if (meaningfulWords.length === 0) {
    return toCamelCase(meanings[0]!);
  }

  // Find the shortest word
  let shortestWord = meaningfulWords[0]!;
  for (let i = 1; i < meaningfulWords.length; i++) {
    const word = meaningfulWords[i]!;
    if (word.length < shortestWord.length) {
      shortestWord = word;
    }
  }

  return toCamelCase(shortestWord);
}
