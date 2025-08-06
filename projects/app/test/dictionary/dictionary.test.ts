import { parseIds, splitHanziText, walkIdsNode } from "#data/hanzi.ts";
import type { HanziGrapheme } from "#data/model.ts";
import { pinyinPronunciationDisplayText } from "#data/pinyin.ts";
import type { Dictionary } from "#dictionary/dictionary.ts";
import {
  allHanziGraphemes,
  allHanziWordsHanzi,
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  allRadicalHanziWords,
  allRadicalsByStrokes,
  decomposeHanzi,
  getIsStructuralHanziWord,
  hanziFromHanziOrHanziWord,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  loadDictionary,
  loadHanziDecomposition,
  loadHanziWordGlossMnemonics,
  loadHanziWordMigrations,
  loadHanziWordPinyinMnemonics,
  loadMissingFontGlyphs,
  loadPinyinSoundNameSuggestions,
  loadPinyinSoundThemeDetails,
  loadPinyinWords,
  loadWiki,
  lookupHanzi,
  lookupHanziWord,
  meaningKeyFromHanziWord,
  upsertHanziWordMeaning,
} from "#dictionary/dictionary.ts";
import { unicodeShortIdentifier } from "#util/unicode.ts";
import {
  mapSetAdd,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { 拼音, 汉 } from "../data/helpers.ts";

test(`radical groups have the right number of elements`, async () => {
  // Data integrity test to ensure that the number of characters in each group
  // matches the expected range.
  const radicalsByStrokes = await allRadicalsByStrokes();
  for (const [, group] of radicalsByStrokes.entries()) {
    expect(
      group.characters.length === group.range[1] - group.range[0] + 1,
    ).toBe(true);
  }
});

test(`json data can be loaded and passes the schema validation`, async () => {
  await allHsk1HanziWords();
  await allHsk2HanziWords();
  await allHsk3HanziWords();
  await loadHanziDecomposition();
  await loadPinyinSoundNameSuggestions();
  await loadPinyinSoundThemeDetails();
  await loadPinyinWords();
  await loadHanziWordGlossMnemonics();
  await loadHanziWordPinyinMnemonics();
  await loadDictionary();
  await loadWiki();
});

const wordLists = [
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  allRadicalHanziWords,
];

test(`hanzi word meaning-keys are not too similar`, async () => {
  const dict = await loadDictionary();

  const hanziToMeaningKey = new Map<string, string[]>();

  // Group by hanzi, and keep a sorted array of meaning-keys.
  for (const hanziWord of dict.keys()) {
    const hanzi = hanziFromHanziWord(hanziWord);
    const meaningKey = meaningKeyFromHanziWord(hanziWord);

    const meaningKeys = hanziToMeaningKey.get(hanzi) ?? [];
    meaningKeys.push(meaningKey);
    meaningKeys.sort(
      mergeSortComparators(
        sortComparatorNumber((x) => x.length),
        sortComparatorString(),
      ),
    );
    hanziToMeaningKey.set(hanzi, meaningKeys);
  }

  // no meaning-key is just a prefix of a sibling meaning-key
  for (const [hanzi, meaningKeys] of hanziToMeaningKey) {
    for (let i = 0; i < meaningKeys.length - 1; i++) {
      for (let j = i + 1; j < meaningKeys.length; j++) {
        const a = meaningKeys[i];
        const b = meaningKeys[j];
        invariant(a != null && b != null);

        if (b.startsWith(a)) {
          throw new Error(
            `${hanzi} meaning-keys ${a} and ${b} are too similar`,
          );
        }
      }
    }
  }
});

test(`hanzi word meaning-key lint`, async () => {
  const dict = await loadDictionary();

  const isViolating = (x: string) =>
    // no "measure word" or "radical"
    /measure ?word| radical/i.exec(x) != null ||
    // only allow english alphabet
    !/^[a-zA-Z]+$/.test(x);

  const violations = new Set(
    [...dict]
      .filter(([hanziWord]) => isViolating(meaningKeyFromHanziWord(hanziWord)))
      .map(([hanziWord]) => ({
        hanziWord,
      })),
  );

  expect(violations).toEqual(new Set());
});

test(`hanzi word meaning gloss lint`, async () => {
  const dict = await loadDictionary();

  const maxWords = 4;
  const maxSpaces = maxWords - 1;

  const isViolating = (x: string) =>
    // no comma
    /,/.exec(x) != null ||
    // no banned characters/phrases
    /measure ?word|radical|particle|\(/i.exec(x) != null ||
    (x.match(/\s+/g)?.length ?? 0) > maxSpaces;

  const violations = new Set(
    [...dict]
      .filter(([, { gloss }]) => gloss.some((x) => isViolating(x)))
      .map(([hanziWord, { gloss }]) => ({
        hanziWord,
        gloss: gloss.filter((x) => isViolating(x)),
      })),
  );

  expect(violations).toEqual(new Set());
});

test(`hanzi meaning componentFormOf lint`, async () => {
  const dict = await loadDictionary();

  const meaningExceptions = new Set([[`示:show`, `礻:ritual`]]);

  for (const [hanziWord, { gloss, componentFormOf }] of dict) {
    if (componentFormOf == null) {
      continue;
    }

    const meaningKey = meaningKeyFromHanziWord(hanziWord);
    const baseHanziMatches = await lookupHanzi(componentFormOf);

    if (baseHanziMatches.length !== 1) {
      throw new Error(
        `hanzi word ${hanziWord} has componentFormOf ${componentFormOf} with ${baseHanziMatches.length} matches (rather than exactly 1)`,
      );
    }

    meaningLint: for (const [baseHanziWord, baseMeaning] of baseHanziMatches) {
      // exceptions
      for (const exception of meaningExceptions) {
        if (baseHanziWord === exception[0] && hanziWord === exception[1]) {
          continue meaningLint;
        }
      }

      if (meaningKeyFromHanziWord(baseHanziWord) !== meaningKey) {
        throw new Error(
          `hanzi word ${hanziWord} has different meaning key to ${baseHanziWord}`,
        );
      }

      if (baseMeaning.gloss[0] !== gloss[0]) {
        throw new Error(
          `hanzi word ${hanziWord} has different primary gloss to ${baseHanziWord}`,
        );
      }
    }
  }
});

test(`hanzi word meaning pinyin lint`, async () => {
  const dict = await loadDictionary();

  // `pinyin` key should be omitted rather than an empty
  {
    const violations = [...dict]
      .filter(([, { pinyin }]) => pinyin?.length === 0)
      .map(([hanziWord]) => hanziWord);
    expect(violations).toEqual([]);
  }

  // Multiple pinyin entries should have the same number of words
  {
    const violations = [...dict]
      .filter(([, { pinyin }]) => {
        if (pinyin == null) {
          return false;
        }
        const syllableCounts = pinyin.map((p) => p.length);
        return new Set(syllableCounts).size > 1;
      })
      .map(([hanziWord]) => hanziWord);
    expect(violations).toEqual([]);
  }
});

test(`hanzi word without visual variants omit the property rather than use an empty array`, async () => {
  const dict = await loadDictionary();

  const hanziWordWithEmptyArray = [...dict]
    .filter(([, { visualVariants }]) => visualVariants?.length === 0)
    .map(([hanziWord]) => hanziWord);

  expect(hanziWordWithEmptyArray).toEqual([]);
});

test(`hanzi word visual variants shouldn't include the hanzi`, async () => {
  const dict = await loadDictionary();

  const hanziWordWithBadVisualVariants = [...dict]
    .filter(
      ([hanziWord, { visualVariants }]) =>
        visualVariants?.includes(hanziFromHanziWord(hanziWord)) === true,
    )
    .map(([hanziWord]) => hanziWord);

  expect(hanziWordWithBadVisualVariants).toEqual([]);
});

test(`hanzi words are unique on (meaning key, primary pinyin)`, async () => {
  const exceptions = new Set(
    [
      [`他们:they`, `它们:they`, `她们:they`],
      [`艹:grass`, `草:grass`],
    ].map((x) => new Set(x)),
  );

  const dict = await loadDictionary();

  const byMeaningKeyAndPinyin = new Map<string, Set<string>>();
  for (const [hanziWord, { pinyin, componentFormOf }] of dict) {
    const meaningKey = meaningKeyFromHanziWord(hanziWord);
    // special case allow "radical" to have overlaps
    if (meaningKey === `radical`) {
      continue;
    }
    // allow component-form of hanzi to have overlaps
    if (componentFormOf != null) {
      continue;
    }
    const primaryPinyin = pinyin?.[0];
    const key = `${meaningKey}:${primaryPinyin == null ? `<nullish>` : pinyinPronunciationDisplayText(primaryPinyin)}`;
    const set = byMeaningKeyAndPinyin.get(key) ?? new Set();
    set.add(hanziWord);
    byMeaningKeyAndPinyin.set(key, set);
  }

  // Make sure that there is only one hanzi word for each meaning key and
  // pinyin, but do it in a way to give a helpful error message.
  const duplicates = [...byMeaningKeyAndPinyin.values()].filter(
    (x) => x.size > 1,
  );

  // Check that there are no duplicates (except for the exceptions).
  expect(
    duplicates.filter(
      (x) =>
        !exceptions.values().some((e) => x.symmetricDifference(e).size === 0),
    ),
  ).toEqual([]);

  // Check that all exceptions are actually used.
  for (const exception of exceptions) {
    if (!duplicates.some((x) => x.symmetricDifference(exception).size === 0)) {
      throw new Error(`exception ${[...exception]} is not used`);
    }
  }
});

test(`hanzi words are unique on (hanzi, part-of-speech, pinyin)`, async () => {
  const exceptions = new Set(
    [
      [`从来:always`, `从来:never`],
      [`块:currency`, `块:pieces`],
      [`天:day`, `天:sky`],
      [`家:family`, `家:home`],
      [`提:carry`, `提:mention`],
      [`米:rice`, `米:meter`],
      [`菜:dish`, `菜:vegetable`],
      [`行:okay`, `行:walk`],
      [`表:surface`, `表:watch`],
      [`要:must`, `要:want`],
      [`面:face`, `面:surface`],
      [`乚:hidden`, `乚:second`],
    ].map((x) => new Set(x)),
  );

  const dict = await loadDictionary();

  const byHanziAndPinyin = new Map<string, Set<string>>();
  for (const [hanziWord, { partOfSpeech, pinyin }] of dict) {
    const hanzi = hanziFromHanziWord(hanziWord);
    const key = `${hanzi}:${partOfSpeech}:${pinyin}`;
    const set = byHanziAndPinyin.get(key) ?? new Set();
    set.add(hanziWord);
    byHanziAndPinyin.set(key, set);
  }

  // Make sure that there is only one hanzi word for each hanzi and
  // pinyin, but do it in a way to give a helpful error message.
  const duplicates = [...byHanziAndPinyin.values()].filter((x) => x.size > 1);

  // Check that all exceptions are actually used.
  for (const exception of exceptions) {
    if (!duplicates.some((x) => x.symmetricDifference(exception).size === 0)) {
      throw new Error(`exception ${[...exception]} is not used`);
    }
  }

  // Check that there are no duplicates (except for the exceptions).
  expect(
    duplicates.filter(
      (x) =>
        !exceptions.values().some((e) => x.symmetricDifference(e).size === 0),
    ),
  ).toEqual([]);
});

test(`all word lists only reference valid hanzi words`, async () => {
  for (const wordList of wordLists) {
    for (const hanziWord of await wordList()) {
      if ((await lookupHanziWord(hanziWord)) === null) {
        throw new Error(
          `missing hanzi word lookup for ${hanziWord} in word list`,
        );
      }
    }
  }
});

test(`all wiki component hanzi words reference valid hanzi words`, async () => {
  const wiki = await loadWiki();
  for (const [hanzi, wikiEntry] of wiki) {
    if (wikiEntry.components != null) {
      for (const { hanziWord } of wikiEntry.components) {
        if (hanziWord != null && (await lookupHanziWord(hanziWord)) === null) {
          throw new Error(
            `missing hanzi word lookup for ${hanziWord} in wiki entry ${hanzi}`,
          );
        }
      }
    }
  }
});

test(`expect missing glyphs to be included decomposition data`, async () => {
  const allGraphemes = await allHanziGraphemes();
  const allComponents = new Set<string>();
  const decompositions = await loadHanziDecomposition();

  for (const grapheme of allGraphemes) {
    allComponents.add(grapheme);
    const ids = decompositions.get(grapheme);
    invariant(
      ids != null,
      `character "${grapheme}" (${unicodeShortIdentifier(grapheme)}) has no decomposition`,
    );
    const idsNode = parseIds(ids);
    for (const leaf of walkIdsNode(idsNode)) {
      if (leaf.operator === `LeafCharacter`) {
        allComponents.add(leaf.character);
      }
    }
  }

  const knownMissingGlyphs = new Set<string>(
    await loadMissingFontGlyphs().then((fontGlyphs) =>
      fontGlyphs.values().flatMap((x) => [...x]),
    ),
  );
  for (const char of allComponents) {
    knownMissingGlyphs.delete(char);
  }

  expect(knownMissingGlyphs).toEqual(new Set());
});

test(`zod schemas are compatible with OpenAI API`, async () => {
  function assertCompatible(schema: z.ZodType): void {
    const jsonSchema = JSON.stringify(
      z.toJSONSchema(schema, { unrepresentable: `any` }),
    );

    // `z.array(…).min(…) is not supported by OpenAI API`,
    expect(jsonSchema).not.toMatch(/"minItems":/g);

    // `z.array(…).max(…) is not supported by OpenAI API`,
    expect(jsonSchema).not.toMatch(/"maxItems":/g);
  }

  assertCompatible(hanziWordMeaningSchema);
});

test(`hanzi uses consistent unicode characters`, async () => {
  const dict = await loadDictionary();
  const violations = [...dict.keys()]
    .map((x) => hanziFromHanziWord(x))
    .flatMap((x) => splitHanziText(x))
    .filter((x) => isNotCjkUnifiedIdeograph(x));
  if (violations.length > 0) {
    throw new Error(
      `found non-CJK unified ideographs: ${await debugNonCjkUnifiedIdeographs(violations)}`,
    );
  }
});

describe(
  `loadHanziWordMigrations suite` satisfies HasNameOf<
    typeof loadHanziWordMigrations
  >,
  async () => {
    test(`no "from" keys are in the dictionary`, async () => {
      const hanziWordRenames = await loadHanziWordMigrations();
      const dictionary = await loadDictionary();
      expect(
        [...hanziWordRenames].filter(([oldHanziWord]) =>
          dictionary.has(oldHanziWord),
        ),
      ).toEqual([]);
    });

    test(`all "to" keys are in the dictionary`, async () => {
      const hanziWordRenames = await loadHanziWordMigrations();
      const dictionary = await loadDictionary();
      expect(
        [...hanziWordRenames].filter(
          ([, newHanziWord]) =>
            newHanziWord != null && !dictionary.has(newHanziWord),
        ),
      ).toEqual([]);
    });

    test(`no "to" keys are also "from" keys (could cause loops)`, async () => {
      const hanziWordRenames = await loadHanziWordMigrations();
      expect(
        [...hanziWordRenames].filter(
          ([, newHanziWord]) =>
            newHanziWord != null && hanziWordRenames.has(newHanziWord),
        ),
      ).toEqual([]);
    });
  },
);

test(`dictionary contains entries for decomposition`, async () => {
  const unknownCharacters = new Map<HanziGrapheme, /* sources */ Set<string>>();
  const unknownComponents = new Map<HanziGrapheme, /* sources */ Set<string>>();

  for (const hanzi of await allHanziWordsHanzi()) {
    for (const grapheme of splitHanziText(hanzi)) {
      const lookup = await lookupHanzi(grapheme);
      if (lookup.length === 0) {
        mapSetAdd(unknownCharacters, grapheme, hanzi);
      }

      for (const component of await decomposeHanzi(grapheme)) {
        const lookup = await lookupHanzi(component);
        if (lookup.length === 0) {
          mapSetAdd(unknownComponents, component, grapheme);
        }
      }
    }
  }

  // Explicit exceptions that are not in the dictionary. The "sources" are
  // stored so that if new items are added to the dictionary that relate to this
  // list, the list can be manually reviewed and updated.
  const allowedMissing = new Map([
    // Couldn't find any standard meaning for this. In most cases this is used
    // at the top and looks like "上", so maybe the decomposition should just
    // pick that instead of going further to "⺊"?
    [`⺊`, new Set([`上`, `占`, `卤`, `攴`, `桌`, `虍`])],
    // Only 3 cases and isn't visually distinctive in the characters.
    [`乀`, new Set([`展`, `水`, `辰`])],
    // Only 3 cases and there doens't seem to be an obvious common meaning.
    [`乛`, new Set([`买`, `了`, `敢`])],
  ]);

  // There's not much value in learning components that are only used once, so
  // we only test that there are dictionary entries for components that are used
  // multiple times.
  const unknownWithMultipleSources = [
    // always learn characters of a word
    ...unknownCharacters,
    ...[...unknownComponents]
      // only learn components that are used at least a few times
      .filter(([, sources]) => sources.size >= 3),
  ]
    // explicitly ignored cases
    .filter(
      ([x, sources]) =>
        allowedMissing.get(x)?.symmetricDifference(sources).size !== 0,
    );

  expect(unknownWithMultipleSources).toEqual([]);
});

test(`dictionary structural components list`, async () => {
  const dictionary = await loadDictionary();

  const structural = dictionary
    .entries()
    .filter(([, meaning]) => meaning.isStructural === true)
    .map(([hanziWord]) => hanziWord)
    .toArray();

  expect(structural).toMatchInlineSnapshot(`
    [
      "丨:line",
      "丶:dot",
      "丷:earsOut",
      "丿:slash",
      "𠂇:hand",
      "𠂉:knife",
      "𠂊:hands",
      "乚:hidden",
      "乚:second",
      "𠃌:radical",
      "亅:hook",
      "𭕄:radical",
      "忄:heart",
    ]
  `);
});

async function debugNonCjkUnifiedIdeographs(chars: string[]): Promise<string> {
  const swaps = [];

  for (const x of chars) {
    const unified = await kangxiRadicalToCjkRadical(x);
    const msg =
      unified == null
        ? `${x} -> ???`
        : `${x} (${x.codePointAt(0)?.toString(16)}) -> ${unified} (${unified.codePointAt(0)?.toString(16)})`;
    swaps.push(msg);
  }

  return swaps.join(`, `);
}

function isCjkUnifiedIdeograph(char: string): boolean {
  const codePoint = char.codePointAt(0);

  return (
    codePoint != null &&
    // CJK Unified Ideographs U+4E00 to U+9FFF
    ((codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      // CJK Unified Ideographs Extension A U+3400 to U+4DBF
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      // CJK Unified Ideographs Extension B U+20000 to U+2A6DF
      (codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
      // CJK Unified Ideographs Extension F U+2CEB0 to U+2EBEF
      (codePoint >= 0x2ceb0 && codePoint <= 0x2ebef))
  );
}

function isNotCjkUnifiedIdeograph(char: string): boolean {
  return !isCjkUnifiedIdeograph(char);
}

async function kangxiRadicalToCjkRadical(
  kangxi: string,
): Promise<string | undefined> {
  const xCodePoint = kangxi.codePointAt(0)!;

  const { EquivalentUnifiedIdeograph } = await import(
    `ucd-full/EquivalentUnifiedIdeograph.json`
  );

  const newCodePoint = EquivalentUnifiedIdeograph.find((rule) => {
    const minHex = rule.range[0]!;
    const maxHex = rule.range[1] ?? rule.range[0]!;

    const min = Number.parseInt(minHex, 16);
    const max = Number.parseInt(maxHex, 16);

    return xCodePoint >= min && xCodePoint <= max;
  })?.unified;

  if (newCodePoint != null) {
    return String.fromCodePoint(Number.parseInt(newCodePoint, 16));
  }
}

describe(
  `hanziFromHanziOrHanziWord suite` satisfies HasNameOf<
    typeof hanziFromHanziOrHanziWord
  >,
  async () => {
    test(`supports hanzi word`, () => {
      expect(hanziFromHanziOrHanziWord(`你好:hello`)).toEqual(`你好`);
    });

    test(`supports hanzi`, () => {
      expect(hanziFromHanziOrHanziWord(汉`你好`)).toEqual(`你好`);
    });
  },
);

describe(
  `upsertHanziWordMeaning suite` satisfies HasNameOf<
    typeof upsertHanziWordMeaning
  >,
  async () => {
    function helloDict(): Dictionary {
      const dict: Dictionary = new Map();
      dict.set(`你好:hello`, {
        gloss: [`hello`],
        pinyin: [[拼音`ni`, 拼音`hao`]],
        partOfSpeech: `interjection`,
      });
      return dict;
    }

    test(`can update pinyin`, async () => {
      const dict = helloDict();

      upsertHanziWordMeaning(dict, `你好:hello`, {
        pinyin: [[拼音`nǐ`, 拼音`hǎo`]],
      });

      expect(dict.get(`你好:hello`)).toEqual({
        gloss: [`hello`],
        pinyin: [[拼音`nǐ`, 拼音`hǎo`]],
        partOfSpeech: `interjection`,
      });
    });
  },
);

describe(
  `getIsStructuralHanziWord suite` satisfies HasNameOf<
    typeof getIsStructuralHanziWord
  >,
  () => {
    test(`fixtures`, async () => {
      const isStructuralHanziWord = await getIsStructuralHanziWord();

      expect(isStructuralHanziWord(`丿:slash`)).toBe(true);
      expect(isStructuralHanziWord(`八:eight`)).toBe(false);
    });
  },
);
