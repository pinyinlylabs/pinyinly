import {
  allHsk1Words,
  allHsk2Words,
  allHsk3Words,
  allRadicalPrimaryForms,
  allRadicalsByStrokes,
  convertPinyinWithToneNumberToToneMark,
  flattenIds,
  idsNodeToString,
  IdsOperator,
  loadHanziDecomposition,
  loadHhPinyinChart,
  loadHmmPinyinChart,
  loadMmPinyinChart,
  loadMnemonicThemeChoices,
  loadMnemonicThemes,
  loadPinyinWords,
  loadRadicalNameMnemonics,
  loadRadicalPinyinMnemonics,
  loadRadicals,
  loadStandardPinyinChart,
  loadWords,
  parseIds,
  parsePinyinTone,
  PinyinChart,
  splitTonelessPinyin,
  walkIdsNode,
} from "#dictionary/dictionary.ts";
import assert from "node:assert/strict";
import test from "node:test";

void test(`radical groups have the right number of elements`, async () => {
  // Data integrity test to ensure that the number of characters in each group
  // matches the expected range.
  const radicalsByStrokes = await allRadicalsByStrokes();
  for (const [, group] of radicalsByStrokes.entries()) {
    assert(group.characters.length === group.range[1] - group.range[0] + 1);
  }
});

void test(`json data can be loaded and passes the schema validation`, async () => {
  await allHsk1Words();
  await allHsk2Words();
  await allHsk3Words();
  await allRadicalPrimaryForms();
  await loadHanziDecomposition();
  await loadHhPinyinChart();
  await loadHmmPinyinChart();
  await loadMmPinyinChart();
  await loadMnemonicThemeChoices();
  await loadMnemonicThemes();
  await loadPinyinWords();
  await loadRadicalNameMnemonics();
  await loadRadicalPinyinMnemonics();
  await loadRadicals();
  await loadStandardPinyinChart();
  await loadWords();
});

void test(`there are no alternative character/punctuations mixed into hsk words`, async () => {
  const words = await allHsk1Words();
  const violatingWords = new Set(words.filter((w) => /[｜（）]/u.test(w)));
  assert.deepEqual(violatingWords, new Set());
});

void test(`there are no pronunciations mixed into word definitions`, async () => {
  const words = await loadWords();

  for (const [, { definitions }] of words) {
    for (const definition of definitions) {
      assert.doesNotMatch(definition, /also pr[a-z]*\.? \[/);
      assert.doesNotMatch(definition, /pronunciation /);
      // assert.doesNotMatch(definition, /\[/); // TODO
    }
  }
});

void test(`there are 214 radicals to match official kangxi radicals`, async () => {
  const radicals = await loadRadicals();
  assert.equal(radicals.length, 214);
});

void test(`radical name mnemonics don't include radical alternatives`, async () => {
  const radicalNameMnemonics = await loadRadicalNameMnemonics();
  const primarySet = new Set(await allRadicalPrimaryForms());

  const radicalsWithNameMnemonics = new Set(radicalNameMnemonics.keys());

  assert.deepEqual(radicalsWithNameMnemonics.difference(primarySet), new Set());
});

void test(`radical pinyin mnemonics don't include radical alternatives`, async () => {
  const pinyinMnemonics = await loadRadicalPinyinMnemonics();
  const primarySet = new Set(await allRadicalPrimaryForms());

  const radicalsWithNameMnemonics = new Set(pinyinMnemonics.keys());

  assert.deepEqual(radicalsWithNameMnemonics.difference(primarySet), new Set());
});

void test(`radical data uses consistent unicode characters`, async () => {
  const primary = await allRadicalPrimaryForms();
  const primarySet = new Set(primary);

  {
    const violations = primary.filter(isNotCjkUnifiedIdeograph);
    assert.deepEqual(
      violations,
      [],
      await debugNonCjkUnifiedIdeographs(violations),
    );
  }

  {
    const sample = [...(await loadRadicalNameMnemonics()).keys()];
    assert.deepEqual(new Set(sample).difference(primarySet), new Set());
    assert.deepEqual(sample.filter(isNotCjkUnifiedIdeograph), []);
  }

  {
    const sample = (await allRadicalsByStrokes())
      .values()
      .flatMap((r) => r.characters);

    {
      const diff = new Set(sample).difference(primarySet);
      assert.deepEqual(
        diff,
        new Set(),
        await debugNonCjkUnifiedIdeographs([...diff]),
      );
    }
    assert.deepEqual([...sample].filter(isNotCjkUnifiedIdeograph), []);
  }
});

void test(`convertPinyinWithToneNumberToToneMark`, () => {
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

void test(parsePinyinTone.name, async () => {
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

void test(`flattenIds handles ⿱⿱ to ⿳ and ⿰⿰ to ⿲`, () => {
  for (const [input, expected] of [
    [`⿱⿱abc`, `⿳abc`],
    [`⿱a⿱bc`, `⿳abc`],
    [`⿰⿰abc`, `⿲abc`],
    [`⿰a⿰bc`, `⿲abc`],
  ] as const) {
    assert.equal(idsNodeToString(flattenIds(parseIds(input))), expected);
  }
});

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
    if (!seen.has(x)) {
      seen.add(x);
    } else {
      duplicates.push(x);
    }
  }
  assert.deepEqual(duplicates, [], `expected no duplicates`);
}

void test(`standard pinyin covers kangxi pinyin`, async () => {
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

void test(`mm pinyin covers kangxi pinyin`, async () => {
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

void test(`hh pinyin covers kangxi pinyin`, async () => {
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

void test(`hmm pinyin covers kangxi pinyin`, async () => {
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

void test(`parseIds handles 1 depth`, () => {
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

void test(`parseIds handles 2 depth`, () => {
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

void test(`walkIdsNode`, () => {
  const ids = parseIds(`⿰a⿱bc`);

  const leafs = [...walkIdsNode(ids)].map((x) => {
    switch (x.type) {
      case `LeafCharacter`:
        return x.character;
      case `LeafUnknownCharacter`:
        return x.strokeCount;
    }
  });

  assert.deepEqual(leafs, [`a`, `b`, `c`]);
});

void test(`idsNodeToString roundtrips`, () => {
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
  ].flatMap((x) => x)) {
    assert.equal(idsNodeToString(parseIds(input)), input);
  }
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
  return char.charCodeAt(0) >= 0x4e00 && char.charCodeAt(0) <= 0x9fff;
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

    const min = parseInt(minHex, 16);
    const max = parseInt(maxHex, 16);

    return xCodePoint >= min && xCodePoint <= max;
  })?.unified;

  if (newCodePoint != null) {
    return String.fromCodePoint(parseInt(newCodePoint, 16));
  }
}
