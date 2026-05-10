import {
  readDictionaryJson,
  upsertHanziWordMeaning,
  writeDictionaryJson,
} from "#bin/util/dictionary.ts";
import { dataDir } from "#bin/util/paths.ts";
import type { HanziText } from "#data/model.js";
import { HskLevel } from "#data/model.js";
import { normalizePinyinText } from "#data/pinyin.js";
import type { HanziWordMeaning } from "#dictionary.js";
import {
  buildHanziWord,
  hanziFromHanziWord,
  loadDictionary,
} from "#dictionary.js";
import { isCi } from "#util/env.js";
import { toCamelCase } from "#util/unicode.js";
import { memoize0, memoize1 } from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import { nonNullable } from "@pinyinly/lib/invariant";
import path from "node:path";
import { describe, expect, test } from "vitest";
import type { DisambiguationHintBucket } from "./completeHskVocabulary.ts";
import {
  disambiguationHints,
  loadCompleteHskVocabulary,
  parsePos,
  resolveDisambiguationHintForm,
} from "./completeHskVocabulary.ts";
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

  const vendorHsk1Items = [];
  const vendorHsk2Items = [];
  const vendorHsk3Items = [];
  const vendorHsk4Items = [];
  const vendorHsk5Items = [];
  const vendorHsk6Items = [];
  const vendorHsk7To9Items = [];

  for (const item of completeHskVocabulary) {
    if (item.level.includes(`new-1`)) {
      vendorHsk1Items.push(item);
    } else if (item.level.includes(`new-2`)) {
      vendorHsk2Items.push(item);
    } else if (item.level.includes(`new-3`)) {
      vendorHsk3Items.push(item);
    } else if (item.level.includes(`new-4`)) {
      vendorHsk4Items.push(item);
    } else if (item.level.includes(`new-5`)) {
      vendorHsk5Items.push(item);
    } else if (item.level.includes(`new-6`)) {
      vendorHsk6Items.push(item);
    } else if (item.level.includes(`new-7`)) {
      vendorHsk7To9Items.push(item);
    }
  }

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
            const disambiguationHintBucket: DisambiguationHintBucket =
              disambiguationHints[vendorHanzi] ?? {};
            const meaningsList = vendorItem.forms
              .map((f) => f.meanings.join(`, `))
              .join(` | `);
            expect
              .soft(
                hasOneMeaning ||
                  Object.keys(disambiguationHintBucket).length > 0,
                `${hskLevel} ${vendorHanzi} has multiple meanings and no disambiguation override: [${meaningsList}]`,
              )
              .toBe(true);

            if (hasOneMeaning) {
              const form = vendorItem.forms[0]!;

              // Take only the first part of the meaning before semicolon/comma
              // and remove any parenthetical content and non-alphabetic chars
              const firstMeaning = nonNullable(form.meanings[0])
                .split(/[;,]/u)[0]!
                .replaceAll(/\([^)]*\)/gu, ``)
                .replaceAll(/[^a-zA-Z\s]/gu, ``)
                .trim();

              // Shorten meaning keys while keeping essential meaning
              // These only need to be unique within the hanzi namespace
              const words = firstMeaning.split(/\s+/u);

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
              for (const [meaningKey, hint] of Object.entries(
                disambiguationHintBucket,
              )) {
                const { primaryGloss, pos: explicitPos } = hint;
                const hanziWord = buildHanziWord(vendorHanzi, meaningKey);
                const form = resolveDisambiguationHintForm(
                  vendorItem,
                  hanziWord,
                  hint,
                );
                const vendorPos = vendorItem.pos.filter((p) => p !== `nr`);

                if (
                  explicitPos != null &&
                  !vendorItem.pos.includes(explicitPos)
                ) {
                  expect
                    .soft(
                      false,
                      `${vendorHanzi} disambiguation pos ${explicitPos} not found in vendor pos: ${vendorPos.join(`, `)}`,
                    )
                    .toBe(true);
                  continue;
                }

                if (explicitPos == null && vendorPos.length !== 1) {
                  expect
                    .soft(false, `${vendorHanzi} has ambiguous POS, define pos`)
                    .toBe(true);
                  continue;
                }

                const newHanziWord = hanziWord;

                const newPos = parsePos(explicitPos ?? vendorPos[0]!);
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

test(`hanziword freq match vendor data`, async () => {
  const completeHskVocabulary = await loadCompleteHskVocabulary();
  const dictionary = await loadDictionary();

  const dict = isCi ? undefined : await readDictionaryJson();
  let shouldWriteDictionary = false;

  for (const vendorItem of completeHskVocabulary) {
    const vendorHanzi = vendorItem.simplified;
    const normalizedFreq = 1 / vendorItem.frequency;

    expect
      .soft(
        Number.isFinite(normalizedFreq) &&
          normalizedFreq > 0 &&
          normalizedFreq <= 1,
        `${vendorHanzi} has invalid normalized freq ${normalizedFreq} from rank ${vendorItem.frequency}`,
      )
      .toBe(true);

    const dictionaryItems = dictionary.lookupHanzi(vendorHanzi);

    for (const [hanziWord, meaning] of dictionaryItems) {
      const hasMatchingFreq =
        meaning.freq != null && Math.abs(meaning.freq - normalizedFreq) < 1e-12;

      expect
        .soft(
          hasMatchingFreq,
          `${hanziWord} has freq ${meaning.freq} but expected ${normalizedFreq}`,
        )
        .toBe(true);
    }

    if (isCi || dict == null) {
      continue;
    }

    if (dictionaryItems.length > 0) {
      for (const [hanziWord, meaning] of dictionaryItems) {
        const hasMatchingFreq =
          meaning.freq != null &&
          Math.abs(meaning.freq - normalizedFreq) < 1e-12;
        if (hasMatchingFreq) {
          continue;
        }

        const existingMeaning = dict.get(hanziWord);
        if (existingMeaning == null) {
          continue;
        }

        dict.set(hanziWord, { ...existingMeaning, freq: normalizedFreq });
        shouldWriteDictionary = true;
      }
      continue;
    }

    const hasOneMeaning = vendorItem.forms.length === 1;
    const disambiguationHintBucket: DisambiguationHintBucket =
      disambiguationHints[vendorHanzi] ?? {};
    const hasDisambiguationHint =
      Object.keys(disambiguationHintBucket).length > 0;

    if (!hasOneMeaning && !hasDisambiguationHint) {
      // Skip words with multiple forms that don't have a disambiguation hint yet.
      // Add an entry to disambiguationHints in completeHskVocabulary.ts to include this word.
      continue;
    }

    if (hasOneMeaning) {
      const form = vendorItem.forms[0]!;
      const meaningKey = guessMeaningKey(form.meanings);
      const hanziWord = buildHanziWord(vendorHanzi, meaningKey);
      upsertHanziWordMeaning(dict, hanziWord, {
        gloss: form.meanings,
        pinyin: [normalizePinyinText(form.transcriptions.pinyin)],
        freq: normalizedFreq,
      });
      shouldWriteDictionary = true;
      continue;
    }

    for (const [meaningKey, hint] of Object.entries(disambiguationHintBucket)) {
      const { primaryGloss, pos: explicitPos } = hint;
      const hanziWord = buildHanziWord(vendorHanzi, meaningKey);

      const form = resolveDisambiguationHintForm(vendorItem, hanziWord, hint);

      const vendorPos = vendorItem.pos.filter((p) => p !== `nr`);
      if (explicitPos != null && !vendorItem.pos.includes(explicitPos)) {
        expect
          .soft(
            false,
            `${vendorHanzi} disambiguation pos ${explicitPos} not found in vendor pos: ${vendorPos.join(`, `)}`,
          )
          .toBe(true);
        continue;
      }

      if (explicitPos == null && vendorPos.length !== 1) {
        expect
          .soft(false, `${vendorHanzi} has ambiguous POS, define pos`)
          .toBe(true);
        continue;
      }

      const pos = parsePos(explicitPos ?? vendorPos[0]!);
      if (pos == null) {
        expect
          .soft(
            false,
            `unable to determine part of speech for ${vendorHanzi} (${vendorItem.pos[0]!})`,
          )
          .toBe(true);
        continue;
      }

      upsertHanziWordMeaning(dict, hanziWord, {
        gloss:
          primaryGloss == null
            ? form.meanings
            : [primaryGloss, ...form.meanings],
        pinyin: [normalizePinyinText(form.transcriptions.pinyin)],
        pos,
        freq: normalizedFreq,
      });
      shouldWriteDictionary = true;
    }
  }

  if (dict != null && shouldWriteDictionary) {
    await writeDictionaryJson(dict);
  }
}, 600_000);

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
    return text.split(/[|｜]/u).map((s) => s.trim());
  }

  // Extract main and hint from parentheses
  function extractHint(text: string): { main: string; hint?: string } {
    const match = /^([^(（]*)(?:[((（]([^)）]*)[))）])?/u.exec(text);
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
  return text.split(/[;]+\s+/u).map((s) => s.trim());
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
      .replaceAll(/[’']/gu, ``)
      .trim();
  }

  function isFillerWord(word: string): boolean {
    return fillerWords.has(cleanWord(word));
  }

  // First pass: Collect all standalone single-word meanings (not phrases)
  const standaloneSingleWords: string[] = [];
  for (const meaning of meanings) {
    const cleanMeaning = meaning.replaceAll(/\([^)]*\)/gu, ``).trim();
    const words = cleanMeaning.split(/\s+/u).filter((w) => w.length > 0);

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
    const cleanMeaning = meaning.replaceAll(/\([^)]*\)/gu, ``).trim();
    const words = cleanMeaning.split(/\s+/u);
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
