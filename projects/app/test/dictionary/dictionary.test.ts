import { parseIds, splitHanziText, walkIdsNode } from "#data/hanzi.ts";
import { parseHhhmark } from "#data/hhhmark.ts";
import type { HanziChar } from "#data/model.ts";
import type { PinyinChart } from "#data/pinyin.ts";
import { splitTonelessPinyin } from "#data/pinyin.ts";
import type { HanziWordMeaning } from "#dictionary/dictionary.ts";
import {
  allHanziCharacters,
  allHanziWordsHanzi,
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  allRadicalHanziWords,
  allRadicalsByStrokes,
  decomposeHanzi,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  loadDictionary,
  loadHanziDecomposition,
  loadHanziWordGlossMnemonics,
  loadHanziWordMigrations,
  loadHanziWordPinyinMnemonics,
  loadHhPinyinChart,
  loadHmmPinyinChart,
  loadMissingFontGlyphs,
  loadMmPinyinChart,
  loadMnemonicThemeChoices,
  loadMnemonicThemes,
  loadPinyinWords,
  loadStandardPinyinChart,
  loadWiki,
  lookupHanzi,
  lookupHanziWord,
  meaningKeyFromHanziWord,
} from "#dictionary/dictionary.ts";
import {
  mapSetAdd,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "#util/collections.ts";
import { unicodeShortIdentifier } from "#util/unicode.ts";
import { invariant, uniqueInvariant } from "@haohaohow/lib/invariant";
import assert from "node:assert/strict";
import test from "node:test";
import { zodResponseFormat } from "openai/helpers/zod";
import type { DeepReadonly } from "ts-essentials";
import type { z } from "zod";

await test(`radical groups have the right number of elements`, async () => {
  // Data integrity test to ensure that the number of characters in each group
  // matches the expected range.
  const radicalsByStrokes = await allRadicalsByStrokes();
  for (const [, group] of radicalsByStrokes.entries()) {
    assert.ok(group.characters.length === group.range[1] - group.range[0] + 1);
  }
});

await test(`json data can be loaded and passes the schema validation`, async () => {
  await allHsk1HanziWords();
  await allHsk2HanziWords();
  await allHsk3HanziWords();
  await loadHanziDecomposition();
  await loadHhPinyinChart();
  await loadHmmPinyinChart();
  await loadMmPinyinChart();
  await loadMnemonicThemeChoices();
  await loadMnemonicThemes();
  await loadPinyinWords();
  await loadHanziWordGlossMnemonics();
  await loadHanziWordPinyinMnemonics();
  await loadStandardPinyinChart();
  await loadDictionary();
  await loadWiki();
});

const wordLists = [
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  allRadicalHanziWords,
];

await test(`hanzi word meaning-keys are not too similar`, async () => {
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

        assert.notEqual(
          b.startsWith(a),
          true,
          `${hanzi} meaning-keys ${a} and ${b} are too similar`,
        );
      }
    }
  }
});

await test(`hanzi word meaning-key lint`, async () => {
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

  assert.deepEqual(violations, new Set());
});

await test(`hanzi word meaning gloss lint`, async () => {
  const dict = await loadDictionary();

  const maxWords = 4;
  const maxSpaces = maxWords - 1;

  const isViolating = (x: string) =>
    // no comma
    /,/.exec(x) != null ||
    // no banned characters/phrases
    /measure ?word|radical|particle|\(/i.exec(x) != null ||
    // doesn't start with "to "
    x.startsWith(`to `) ||
    (x.match(/\s+/g)?.length ?? 0) > maxSpaces;

  const violations = new Set(
    [...dict]
      .filter(([, { gloss }]) => gloss.some((x) => isViolating(x)))
      .map(([hanziWord, { gloss }]) => ({
        hanziWord,
        gloss: gloss.filter((x) => isViolating(x)),
      })),
  );

  assert.deepEqual(violations, new Set());
});

await test(`hanzi word meaning glossHint lint`, async () => {
  const dict = await loadDictionary();

  const maxWords = 100;
  const maxSpaces = maxWords - 1;

  const isViolating = (
    glossHint: string,
    meaning: DeepReadonly<HanziWordMeaning>,
  ) =>
    // no double space
    /  /.exec(glossHint) != null ||
    // referencing "component form of" must match the .componentFormOf
    (/component form of ([^., ]+)/i.exec(glossHint)?.[1] ??
      meaning.componentFormOf) != meaning.componentFormOf ||
    // doesn't exceed word limit
    (glossHint.match(/\s+/g)?.length ?? 0) > maxSpaces;

  const violations = new Set(
    [...dict]
      .filter(
        ([, meaning]) =>
          meaning.glossHint != null && isViolating(meaning.glossHint, meaning),
      )
      .map(([hanziWord, { glossHint }]) => ({
        hanziWord,
        glossHint,
      })),
  );

  assert.deepEqual(violations, new Set());
});

await test(`hanzi meaning glossHint lint`, async () => {
  // all HanziWord references should exist in the dictionary
  const dict = await loadDictionary();

  for (const [hanziWord, { glossHint }] of dict) {
    if (glossHint == null) {
      continue;
    }

    const hanziWordRefs = parseHhhmark(glossHint).filter(
      (x) => x.type === `hanziWord`,
    );

    for (const hanziWordRef of hanziWordRefs) {
      if (!dict.has(hanziWordRef.hanziWord)) {
        assert.fail(
          `hanzi word ${hanziWord} has references HanziWord ${hanziWordRef.hanziWord} but it is not in the dictionary`,
        );
      }
    }
  }
});

await test(`hanzi meaning componentFormOf lint`, async () => {
  const dict = await loadDictionary();

  const meaningExceptions = new Set([[`示:show`, `礻:ritual`]]);

  for (const [hanziWord, { gloss, componentFormOf }] of dict) {
    if (componentFormOf == null) {
      continue;
    }

    const meaningKey = meaningKeyFromHanziWord(hanziWord);
    const baseHanziMatches = await lookupHanzi(componentFormOf);

    if (baseHanziMatches.length !== 1) {
      assert.fail(
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
        assert.fail(
          `hanzi word ${hanziWord} has different meaning key to ${baseHanziWord}`,
        );
      }

      if (baseMeaning.gloss[0] !== gloss[0]) {
        assert.fail(
          `hanzi word ${hanziWord} has different primary gloss to ${baseHanziWord}`,
        );
      }
    }
  }
});

await test(`hanzi word meaning example is not in english`, async () => {
  const dict = await loadDictionary();

  const violations = new Set(
    [...dict]
      .filter(([, { example }]) => {
        // Only check for lower-case english letters, because sometimes examples
        // have words like APP in them.
        return example != null && /[a-z]/u.test(example);
      })
      .map(([hanziWord, meaning]) => `${hanziWord} ${meaning.example}`),
  );

  assert.deepEqual(violations, new Set());
});

await test(`hanzi word without pinyin omit the property rather than use an empty array`, async () => {
  const dict = await loadDictionary();

  const hanziWordWithEmptyArray = [...dict]
    .filter(([, { pinyin }]) => pinyin?.length === 0)
    .map(([hanziWord]) => hanziWord);

  assert.deepEqual(hanziWordWithEmptyArray, []);
});

await test(`hanzi word without visual variants omit the property rather than use an empty array`, async () => {
  const dict = await loadDictionary();

  const hanziWordWithEmptyArray = [...dict]
    .filter(([, { visualVariants }]) => visualVariants?.length === 0)
    .map(([hanziWord]) => hanziWord);

  assert.deepEqual(hanziWordWithEmptyArray, []);
});

await test(`hanzi word meanings actually include the hanzi in the example`, async () => {
  const dict = await loadDictionary();

  const hanziWordWithBadExamples = [...dict]
    .filter(
      ([hanziWord, { example }]) =>
        example != null && !example.includes(hanziFromHanziWord(hanziWord)),
    )
    .map(([hanziWord]) => hanziWord);

  assert.deepEqual(hanziWordWithBadExamples, []);
});

await test(`hanzi word visual variants shouldn't include the hanzi`, async () => {
  const dict = await loadDictionary();

  const hanziWordWithBadVisualVariants = [...dict]
    .filter(
      ([hanziWord, { visualVariants }]) =>
        visualVariants?.includes(hanziFromHanziWord(hanziWord)) === true,
    )
    .map(([hanziWord]) => hanziWord);

  assert.deepEqual(hanziWordWithBadVisualVariants, []);
});

await test(`hanzi words are unique on (meaning key, pinyin)`, async () => {
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
    const key = `${meaningKey}:${pinyin}`;
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
  assert.deepEqual(
    duplicates.filter(
      (x) =>
        !exceptions.values().some((e) => x.symmetricDifference(e).size === 0),
    ),
    [],
  );

  // Check that all exceptions are actually used.
  for (const exception of exceptions) {
    assert.ok(
      duplicates.some((x) => x.symmetricDifference(exception).size === 0),
      `exception ${[...exception]} is not used`,
    );
  }
});

await test(`hanzi words are unique on (hanzi, part-of-speech, pinyin)`, async () => {
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
    assert.ok(
      duplicates.some((x) => x.symmetricDifference(exception).size === 0),
      `exception ${[...exception]} is not used`,
    );
  }

  // Check that there are no duplicates (except for the exceptions).
  assert.deepEqual(
    duplicates.filter(
      (x) =>
        !exceptions.values().some((e) => x.symmetricDifference(e).size === 0),
    ),
    [],
  );
});

await test(`all word lists only reference valid hanzi words`, async () => {
  for (const wordList of wordLists) {
    for (const hanziWord of await wordList()) {
      assert.notEqual(
        await lookupHanziWord(hanziWord),
        null,
        `missing hanzi word lookup for ${hanziWord} in word list`,
      );
    }
  }
});

await test(`all wiki component hanzi words reference valid hanzi words`, async () => {
  const wiki = await loadWiki();
  for (const [hanzi, wikiEntry] of wiki) {
    if (wikiEntry.components != null) {
      for (const { hanziWord } of wikiEntry.components) {
        if (hanziWord != null) {
          assert.notEqual(
            await lookupHanziWord(hanziWord),
            null,
            `missing hanzi word lookup for ${hanziWord} in wiki entry ${hanzi}`,
          );
        }
      }
    }
  }
});

await test(`expect missing glyphs to be included decomposition data`, async () => {
  const allChars = await allHanziCharacters();
  const allComponents = new Set<string>();
  const decompositions = await loadHanziDecomposition();

  for (const char of allChars) {
    allComponents.add(char);
    const ids = decompositions.get(char);
    invariant(
      ids != null,
      `character "${char}" (${unicodeShortIdentifier(char)}) has no decomposition`,
    );
    const idsNode = parseIds(ids);
    for (const leaf of walkIdsNode(idsNode)) {
      if (leaf.type === `LeafCharacter`) {
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

  assert.deepEqual(knownMissingGlyphs, new Set());
});

void test.todo(
  `hanzi name mnemonics don't include visual variants`,
  async () => {
    // const radicalNameMnemonics = await loadHanziWordGlossMnemonics();
    // const primarySet = new Set(await allRadicalPrimaryForms());
    // const radicalsWithNameMnemonics = new Set(radicalNameMnemonics.keys());
    // assert.deepEqual(radicalsWithNameMnemonics.difference(primarySet), new Set());
  },
);

void test.todo(
  `hanzi pinyin mnemonics don't include visual variants`,
  async () => {
    // const pinyinMnemonics = await loadRadicalPinyinMnemonics();
    // const primarySet = new Set(await allRadicalPrimaryForms());
    // const radicalsWithNameMnemonics = new Set(pinyinMnemonics.keys());
    // assert.deepEqual(radicalsWithNameMnemonics.difference(primarySet), new Set());
  },
);

await test(`zod schemas are compatible with OpenAI API`, async () => {
  function assertCompatible(schema: z.ZodType): void {
    const jsonSchema = JSON.stringify(
      zodResponseFormat(schema, `result_shape`).json_schema,
    );

    assert.doesNotMatch(
      jsonSchema,
      /"minItems":/g,
      `z.array(…).min(…) is not supported by OpenAI API`,
    );
    assert.doesNotMatch(
      jsonSchema,
      /"maxItems":/g,
      `z.array(…).max(…) is not supported by OpenAI API`,
    );
  }

  assertCompatible(hanziWordMeaningSchema);
});

await test(`hanzi uses consistent unicode characters`, async () => {
  const dict = await loadDictionary();
  const violations = [...dict.keys()]
    .map((x) => hanziFromHanziWord(x))
    .flatMap((x) => splitHanziText(x))
    .filter((x) => isNotCjkUnifiedIdeograph(x));
  assert.deepEqual(
    violations,
    [],
    await debugNonCjkUnifiedIdeographs(violations),
  );
});

await test(`standard pinyin covers kangxi pinyin`, async () => {
  const chart = await loadStandardPinyinChart();

  await testPinyinChart(chart, [
    [`a`, `∅`, `a`],
    [`an`, `∅`, `an`],
    [`ê`, `∅`, `ê`],
    [`ju`, `j`, `ü`],
    [`qu`, `q`, `ü`],
    [`xu`, `x`, `ü`],
    [`bu`, `b`, `u`],
    [`pu`, `p`, `u`],
    [`mu`, `m`, `u`],
    [`fu`, `f`, `u`],
    [`du`, `d`, `u`],
    [`tu`, `t`, `u`],
    [`nu`, `n`, `u`],
    [`niu`, `n`, `iu`],
    [`lu`, `l`, `u`],
    [`gu`, `g`, `u`],
    [`ku`, `k`, `u`],
    [`hu`, `h`, `u`],
    [`wu`, `∅`, `u`],
    [`wa`, `∅`, `ua`],
    [`er`, `∅`, `er`],
    [`yi`, `∅`, `i`],
    [`ya`, `∅`, `ia`],
    [`yo`, `∅`, `io`],
    [`ye`, `∅`, `ie`],
    [`yai`, `∅`, `iai`],
    [`yao`, `∅`, `iao`],
    [`you`, `∅`, `iu`],
    [`yan`, `∅`, `ian`],
    [`yin`, `∅`, `in`],
    [`yang`, `∅`, `iang`],
    [`ying`, `∅`, `ing`],
    [`wu`, `∅`, `u`],
    [`wa`, `∅`, `ua`],
    [`wo`, `∅`, `uo`],
    [`wai`, `∅`, `uai`],
    [`wei`, `∅`, `ui`],
    [`wan`, `∅`, `uan`],
    [`wen`, `∅`, `un`],
    [`wang`, `∅`, `uang`],
    [`weng`, `∅`, `ong`],
    [`ong`, `∅`, `ong`],
    [`yu`, `∅`, `ü`],
    [`yue`, `∅`, `üe`],
    [`yuan`, `∅`, `üan`],
    [`yun`, `∅`, `ün`],
    [`yong`, `∅`, `iong`],
    [`ju`, `j`, `ü`],
    [`jue`, `j`, `üe`],
    [`juan`, `j`, `üan`],
    [`jun`, `j`, `ün`],
    [`jiong`, `j`, `iong`],
    [`qu`, `q`, `ü`],
    [`que`, `q`, `üe`],
    [`quan`, `q`, `üan`],
    [`qun`, `q`, `ün`],
    [`qiong`, `q`, `iong`],
    [`xu`, `x`, `ü`],
    [`xue`, `x`, `üe`],
    [`xuan`, `x`, `üan`],
    [`xun`, `x`, `ün`],
    [`xiong`, `x`, `iong`],
  ]);
});

await test(`mm pinyin covers kangxi pinyin`, async () => {
  const chart = await loadMmPinyinChart();

  await testPinyinChart(chart, [
    [`zhang`, `zh`, `ang`],
    [`bao`, `b`, `ao`],
    [`ao`, `∅`, `ao`],
    [`ba`, `b`, `a`],
    [`ci`, `c`, `∅`],
    [`chi`, `ch`, `∅`],
    [`cong`, `cu`, `(e)ng`],
    [`chong`, `chu`, `(e)ng`],
    [`chui`, `chu`, `ei`],
    [`diu`, `di`, `ou`],
    [`miu`, `mi`, `ou`],
    [`niu`, `ni`, `ou`],
    [`you`, `y`, `ou`],
    [`yin`, `y`, `(e)n`],
    [`ê`, `∅`, `e`],
    [`er`, `∅`, `∅`],
    // [`zh(i)`, `zh`, `∅`], // ?
    [`zha`, `zh`, `a`],
    [`zhong`, `zhu`, `(e)ng`],
    [`zhe`, `zh`, `e`],
    [`ta`, `t`, `a`],
    [`a`, `∅`, `a`],
    [`xing`, `xi`, `(e)ng`],
    [`qing`, `qi`, `(e)ng`],
  ]);
});

await test(`hh pinyin covers kangxi pinyin`, async () => {
  const chart = await loadHhPinyinChart();

  await testPinyinChart(chart, [
    [`a`, `_`, `a`],
    [`bi`, `bi`, `_`],
    [`niu`, `ni`, `(o)u`],
    [`tie`, `ti`, `e`],
    [`zhou`, `zh`, `(o)u`],
    [`zhuo`, `zhu`, `o`],
  ]);
});

await test(`hmm pinyin covers kangxi pinyin`, async () => {
  const chart = await loadHmmPinyinChart();

  assert.equal(chart.initials.flatMap((i) => i.initials).length, 55);
  assert.equal(chart.finals.length, 13);

  await testPinyinChart(chart, [
    [`a`, `∅`, `a`],
    [`er`, `∅`, `∅`],
    [`ci`, `c`, `∅`],
    [`yi`, `yi`, `∅`],
    [`ya`, `yi`, `a`],
    [`wa`, `wu`, `a`],
    [`wu`, `wu`, `∅`],
    [`bi`, `bi`, `∅`],
    [`bin`, `bi`, `(e)n`],
    [`meng`, `m`, `(e)ng`],
    [`ming`, `mi`, `(e)ng`],
    [`li`, `li`, `∅`],
    [`diu`, `di`, `ou`],
    [`niu`, `ni`, `ou`],
    [`lu`, `lu`, `∅`],
    [`lü`, `lü`, `∅`],
    [`tie`, `ti`, `e`],
    [`zhou`, `zh`, `ou`],
    [`zhuo`, `zhu`, `o`],
    [`shua`, `shu`, `a`],
  ]);
});

await test(`${loadHanziWordMigrations.name} suite`, async () => {
  await test(`no "from" keys are in the dictionary`, async () => {
    const hanziWordRenames = await loadHanziWordMigrations();
    const dictionary = await loadDictionary();
    assert.deepEqual(
      [...hanziWordRenames].filter(([oldHanziWord]) =>
        dictionary.has(oldHanziWord),
      ),
      [],
    );
  });

  await test(`all "to" keys are in the dictionary`, async () => {
    const hanziWordRenames = await loadHanziWordMigrations();
    const dictionary = await loadDictionary();
    assert.deepEqual(
      [...hanziWordRenames].filter(
        ([, newHanziWord]) => !dictionary.has(newHanziWord),
      ),
      [],
    );
  });
});

await test(`dictionary contains entries for decomposition`, async () => {
  const unknownCharacters = new Map<
    /* hanzi */ HanziChar,
    /* sources */ Set<string>
  >();
  const unknownComponents = new Map<
    /* hanzi */ HanziChar,
    /* sources */ Set<string>
  >();

  for (const hanzi of await allHanziWordsHanzi()) {
    for (const character of splitHanziText(hanzi)) {
      const lookup = await lookupHanzi(character);
      if (lookup.length === 0) {
        mapSetAdd(unknownCharacters, character, hanzi);
      }

      for (const component of await decomposeHanzi(character)) {
        const lookup = await lookupHanzi(component);
        if (lookup.length === 0) {
          mapSetAdd(unknownComponents, component, character);
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

  assert.deepEqual(unknownWithMultipleSources, []);
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

async function testPinyinChart(
  chart: PinyinChart,
  testCases: readonly [
    input: string,
    expectedInitial: string,
    expectedFinal: string,
  ][] = [],
): Promise<void> {
  const pinyinWords = await loadPinyinWords();

  // Start with test cases first as these are easier to debug.
  for (const [input, initial, final] of testCases) {
    assert.deepEqual(
      splitTonelessPinyin(input, chart),
      [initial, final],
      `${input} didn't split as expected`,
    );
  }

  for (const x of pinyinWords) {
    assert.notEqual(splitTonelessPinyin(x, chart), null, `couldn't split ${x}`);
  }

  // Ensure that there are no duplicates initials or finals.
  uniqueInvariant(
    chart.initials.flatMap((x) => x.initials).flatMap(([, ...x]) => x),
  );
  uniqueInvariant(chart.finals.flatMap(([, ...x]) => x));
}
