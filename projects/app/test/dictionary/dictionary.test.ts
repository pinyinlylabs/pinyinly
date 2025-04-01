import { HanziText } from "#data/model.ts";
import {
  allHanziCharacters,
  allHanziWordsHanzi,
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  allRadicalHanziWords,
  allRadicalsByStrokes,
  convertPinyinWithToneNumberToToneMark,
  decomposeHanzi,
  flattenIds,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  idsNodeToString,
  IdsOperator,
  loadDictionary,
  loadHanziDecomposition,
  loadHanziWordGlossMnemonics,
  loadHanziWordPinyinMnemonics,
  loadHhPinyinChart,
  loadHmmPinyinChart,
  loadMissingFontGlyphs,
  loadMmPinyinChart,
  loadMnemonicThemeChoices,
  loadMnemonicThemes,
  loadPinyinWords,
  loadStandardPinyinChart,
  lookupHanzi,
  lookupHanziWord,
  meaningKeyFromHanziWord,
  parseIds,
  parsePinyinTone,
  PinyinChart,
  splitHanziText,
  splitTonelessPinyin,
  unicodeShortIdentifier,
  walkIdsNode,
} from "#dictionary/dictionary.ts";
import {
  mapSetAdd,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "#util/collections.ts";
import { invariant } from "@haohaohow/lib/invariant";
import assert from "node:assert/strict";
import test from "node:test";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

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
    // no "measure word" or "radical" or "particle" or "("
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

  const isViolating = (x: string) =>
    // no double space
    /  /.exec(x) != null ||
    // no new lines
    // /\n/.exec(x) != null ||
    // doesn't exceed word limit
    (x.match(/\s+/g)?.length ?? 0) > maxSpaces;

  const violations = new Set(
    [...dict]
      .filter(
        ([, { glossHint }]) => glossHint != null && isViolating(glossHint),
      )
      .map(([hanziWord, { glossHint }]) => ({
        hanziWord,
        glossHint,
      })),
  );

  assert.deepEqual(violations, new Set());
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
      [`人:person`, `亻:person`],
      [`他们:they`, `它们:they`, `她们:they`],
      [`刂:knife`, `𠂉:knife`],
      [`扌:hand`, `爫:hand`, `𠂇:hand`],
      [`氵:water`, `氺:water`],
      [`艹:grass`, `草:grass`],
      [`言:speech`, `讠:speech`],
    ].map((x) => new Set(x)),
  );

  const dict = await loadDictionary();

  const byMeaningKeyAndPinyin = new Map<string, Set<string>>();
  for (const [hanziWord, { pinyin }] of dict) {
    const meaningKey = meaningKeyFromHanziWord(hanziWord);
    // special case allow "radical" to have overlaps
    if (meaningKey === `radical`) {
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

await test(`${convertPinyinWithToneNumberToToneMark.name} fixtures`, () => {
  // Rules: (from https://en.wikipedia.org/wiki/Pinyin)
  // 1. If there is an a or an e, it will take the tone mark
  // 2. If there is an ou, then the o takes the tone mark
  // 3. Otherwise, the second vowel takes the tone mark

  for (const [input, expected] of [
    // a
    [`a`, `a`],
    [`a1`, `ā`],
    [`a2`, `á`],
    [`a3`, `ǎ`],
    [`a4`, `à`],
    [`a5`, `a`],
    // e
    [`e`, `e`],
    [`e1`, `ē`],
    [`e2`, `é`],
    [`e3`, `ě`],
    [`e4`, `è`],
    [`e5`, `e`],
    // i
    [`bi`, `bi`],
    [`bi1`, `bī`],
    [`bi2`, `bí`],
    [`bi3`, `bǐ`],
    [`bi4`, `bì`],
    [`bi5`, `bi`],
    // o
    [`o`, `o`],
    [`o1`, `ō`],
    [`o2`, `ó`],
    [`o3`, `ǒ`],
    [`o4`, `ò`],
    [`o5`, `o`],
    // u
    [`u`, `u`],
    [`u1`, `ū`],
    [`u2`, `ú`],
    [`u3`, `ǔ`],
    [`u4`, `ù`],
    [`u5`, `u`],
    // ü
    [`ü`, `ü`],
    [`ü1`, `ǖ`],
    [`ü2`, `ǘ`],
    [`ü3`, `ǚ`],
    [`ü4`, `ǜ`],
    [`ü5`, `ü`],
    // ü (as ascii v)
    [`v`, `ü`],
    [`v1`, `ǖ`],
    [`v2`, `ǘ`],
    [`v3`, `ǚ`],
    [`v4`, `ǜ`],
    [`v5`, `ü`],

    // If there is an ou, then the o takes the tone mark
    [`dou`, `dou`],
    [`dou1`, `dōu`],
    [`dou2`, `dóu`],
    [`dou3`, `dǒu`],
    [`dou4`, `dòu`],
    [`dou5`, `dou`],

    // A few examples
    [`hao3`, `hǎo`],
    [`zhu5`, `zhu`],
    [`zi5`, `zi`],
  ] as const) {
    assert.equal(convertPinyinWithToneNumberToToneMark(input), expected);
  }
});

await test(`${parsePinyinTone.name} fixtures`, async () => {
  await test(`static test cases`, () => {
    for (const [input, expected] of [
      [`niú`, [`niu`, 2]],
      [`hǎo`, [`hao`, 3]],
      [`ǖ`, [`ü`, 1]],
      [`ǘ`, [`ü`, 2]],
      [`ǚ`, [`ü`, 3]],
      [`ǜ`, [`ü`, 4]],
      [`ü`, [`ü`, 5]],
    ] as const) {
      assert.deepEqual(parsePinyinTone(input), expected);
    }
  });
});

await test(`${flattenIds.name} handles ⿱⿱ to ⿳ and ⿰⿰ to ⿲`, () => {
  for (const [input, expected] of [
    [`⿱⿱abc`, `⿳abc`],
    [`⿱a⿱bc`, `⿳abc`],
    [`⿰⿰abc`, `⿲abc`],
    [`⿰a⿰bc`, `⿲abc`],
  ] as const) {
    assert.equal(idsNodeToString(flattenIds(parseIds(input))), expected);
  }
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

await test(`${parseIds.name} handles 1 depth`, () => {
  assert.deepEqual(parseIds(`木`), {
    type: `LeafCharacter`,
    character: `木`,
  });

  // 相
  assert.deepEqual(parseIds(`⿰木目`), {
    type: IdsOperator.LeftToRight,
    left: { type: `LeafCharacter`, character: `木` },
    right: { type: `LeafCharacter`, character: `目` },
  });

  // 杏
  assert.deepEqual(parseIds(`⿱木口`), {
    type: IdsOperator.AboveToBelow,
    above: { type: `LeafCharacter`, character: `木` },
    below: { type: `LeafCharacter`, character: `口` },
  });

  // 衍
  assert.deepEqual(parseIds(`⿲彳氵亍`), {
    type: IdsOperator.LeftToMiddleToRight,
    left: { type: `LeafCharacter`, character: `彳` },
    middle: { type: `LeafCharacter`, character: `氵` },
    right: { type: `LeafCharacter`, character: `亍` },
  });

  // 京
  assert.deepEqual(parseIds(`⿳亠口小`), {
    type: IdsOperator.AboveToMiddleAndBelow,
    above: { type: `LeafCharacter`, character: `亠` },
    middle: { type: `LeafCharacter`, character: `口` },
    below: { type: `LeafCharacter`, character: `小` },
  });

  // 回
  assert.deepEqual(parseIds(`⿴囗口`), {
    type: IdsOperator.FullSurround,
    surrounding: { type: `LeafCharacter`, character: `囗` },
    surrounded: { type: `LeafCharacter`, character: `口` },
  });

  // 凰
  assert.deepEqual(parseIds(`⿵几皇`), {
    type: IdsOperator.SurroundFromAbove,
    above: { type: `LeafCharacter`, character: `几` },
    surrounded: { type: `LeafCharacter`, character: `皇` },
  });

  // 凶
  assert.deepEqual(parseIds(`⿶凵㐅`), {
    type: IdsOperator.SurroundFromBelow,
    below: { type: `LeafCharacter`, character: `凵` },
    surrounded: { type: `LeafCharacter`, character: `㐅` },
  });

  // 匠
  assert.deepEqual(parseIds(`⿷匚斤`), {
    type: IdsOperator.SurroundFromLeft,
    left: { type: `LeafCharacter`, character: `匚` },
    surrounded: { type: `LeafCharacter`, character: `斤` },
  });

  // 㕚
  assert.deepEqual(parseIds(`⿼叉丶`), {
    type: IdsOperator.SurroundFromRight,
    right: { type: `LeafCharacter`, character: `叉` },
    surrounded: { type: `LeafCharacter`, character: `丶` },
  });

  // 病
  assert.deepEqual(parseIds(`⿸疒丙`), {
    type: IdsOperator.SurroundFromUpperLeft,
    upperLeft: { type: `LeafCharacter`, character: `疒` },
    surrounded: { type: `LeafCharacter`, character: `丙` },
  });

  // 戒
  assert.deepEqual(parseIds(`⿹戈廾`), {
    type: IdsOperator.SurroundFromUpperRight,
    upperRight: { type: `LeafCharacter`, character: `戈` },
    surrounded: { type: `LeafCharacter`, character: `廾` },
  });

  // 超
  assert.deepEqual(parseIds(`⿺走召`), {
    type: IdsOperator.SurroundFromLowerLeft,
    lowerLeft: { type: `LeafCharacter`, character: `走` },
    surrounded: { type: `LeafCharacter`, character: `召` },
  });

  // 氷
  assert.deepEqual(parseIds(`⿽水丶`), {
    type: IdsOperator.SurroundFromLowerRight,
    lowerRight: { type: `LeafCharacter`, character: `水` },
    surrounded: { type: `LeafCharacter`, character: `丶` },
  });

  // 巫
  assert.deepEqual(parseIds(`⿻工从`), {
    type: IdsOperator.Overlaid,
    overlay: { type: `LeafCharacter`, character: `工` },
    underlay: { type: `LeafCharacter`, character: `从` },
  });

  // 卐
  assert.deepEqual(parseIds(`⿾卍`), {
    type: IdsOperator.HorizontalReflection,
    reflected: { type: `LeafCharacter`, character: `卍` },
  });

  // 𠕄
  assert.deepEqual(parseIds(`⿿凹`), {
    type: IdsOperator.Rotation,
    rotated: { type: `LeafCharacter`, character: `凹` },
  });

  assert.deepEqual(parseIds(`①`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 1,
  });

  assert.deepEqual(parseIds(`②`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 2,
  });

  assert.deepEqual(parseIds(`③`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 3,
  });

  assert.deepEqual(parseIds(`④`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 4,
  });

  assert.deepEqual(parseIds(`⑤`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 5,
  });

  assert.deepEqual(parseIds(`⑥`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 6,
  });

  assert.deepEqual(parseIds(`⑦`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 7,
  });

  assert.deepEqual(parseIds(`⑧`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 8,
  });

  assert.deepEqual(parseIds(`⑨`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 9,
  });

  assert.deepEqual(parseIds(`⑩`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 10,
  });

  assert.deepEqual(parseIds(`⑪`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 11,
  });

  assert.deepEqual(parseIds(`⑫`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 12,
  });

  assert.deepEqual(parseIds(`⑬`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 13,
  });

  assert.deepEqual(parseIds(`⑭`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 14,
  });

  assert.deepEqual(parseIds(`⑮`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 15,
  });

  assert.deepEqual(parseIds(`⑯`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 16,
  });

  assert.deepEqual(parseIds(`⑰`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 17,
  });

  assert.deepEqual(parseIds(`⑱`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 18,
  });

  assert.deepEqual(parseIds(`⑲`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 19,
  });

  assert.deepEqual(parseIds(`⑳`), {
    type: `LeafUnknownCharacter`,
    strokeCount: 20,
  });
});

await test(`${parseIds.name} handles 2 depth`, () => {
  {
    const cursor = { index: 0 };
    assert.deepEqual(parseIds(`⿰a⿱bc`, cursor), {
      type: IdsOperator.LeftToRight,
      left: { type: `LeafCharacter`, character: `a` },
      right: {
        type: IdsOperator.AboveToBelow,
        above: { type: `LeafCharacter`, character: `b` },
        below: { type: `LeafCharacter`, character: `c` },
      },
    });
    assert.deepEqual(cursor, { index: 5 });
  }

  {
    const cursor = { index: 0 };
    assert.deepEqual(parseIds(`⿱a⿳bc⿴de`, cursor), {
      type: IdsOperator.AboveToBelow,
      above: { type: `LeafCharacter`, character: `a` },
      below: {
        type: IdsOperator.AboveToMiddleAndBelow,
        above: { type: `LeafCharacter`, character: `b` },
        middle: { type: `LeafCharacter`, character: `c` },
        below: {
          type: IdsOperator.FullSurround,
          surrounding: { type: `LeafCharacter`, character: `d` },
          surrounded: { type: `LeafCharacter`, character: `e` },
        },
      },
    });
    assert.deepEqual(cursor, { index: 8 });
  }
});

await test(`${parseIds.name} regression tests`, () => {
  assert.deepEqual(parseIds(`⿱丿𭕄`), {
    type: IdsOperator.AboveToBelow,
    above: { type: `LeafCharacter`, character: `丿` },
    below: { type: `LeafCharacter`, character: `𭕄` },
  });
});

await test(`${walkIdsNode.name} fixture`, () => {
  const ids = parseIds(`⿰a⿱bc`);

  const leafs = [...walkIdsNode(ids)].map((x) => {
    switch (x.type) {
      case `LeafCharacter`: {
        return x.character;
      }
      case `LeafUnknownCharacter`: {
        return x.strokeCount;
      }
    }
  });

  assert.deepEqual(leafs, [`a`, `b`, `c`]);
});

await test(`${idsNodeToString.name} roundtrips`, () => {
  for (const input of [
    [`木`],
    [`⿰木目`, `⿱木口`, `⿲彳氵亍`, `⿳亠口小`],
    [`⿴囗口`, `⿵几皇`, `⿶凵㐅`, `⿷匚斤`, `⿸疒丙`, `⿹戈廾`],
    [`⿺走召`],
    [`⿻工从`],
    [`⿼叉丶`],
    [`⿽水丶`],
    [`⿾卍`],
    [`⿿凹`],
    [`①`, `②`, `③`, `④`, `⑤`, `⑥`, `⑦`, `⑧`, `⑨`, `⑩`],
    [`⑪`, `⑫`, `⑬`, `⑭`, `⑮`, `⑯`, `⑰`, `⑱`, `⑲`, `⑳`],
  ].flat()) {
    assert.equal(idsNodeToString(parseIds(input)), input);
  }
});

await test(`dictionary contains entries for decomposition`, async () => {
  const unknownCharacters = new Map<
    /* hanzi */ HanziText,
    /* sources */ Set<HanziText>
  >();
  const unknownComponents = new Map<
    /* hanzi */ HanziText,
    /* sources */ Set<HanziText>
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
    // Coulnd't find any standard meaning for this. In most cases this is used
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
      // only learn components that are used at least 3 times
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
  assertUniqueArray(
    chart.initials.map((x) => x.initials).flatMap(([, ...x]) => x),
  );
  assertUniqueArray(chart.finals.flatMap(([, ...x]) => x));
}

function assertUniqueArray<T>(items: readonly T[]): void {
  const seen = new Set();
  const duplicates = [];
  for (const x of items) {
    if (seen.has(x)) {
      duplicates.push(x);
    } else {
      seen.add(x);
    }
  }
  assert.deepEqual(duplicates, [], `expected no duplicates`);
}
