import type { PinyinUnit } from "#data/model.js";
import type { PinyinChart } from "#data/pinyin.ts";
import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupRanks,
  defaultPinyinSoundGroupThemes,
  defaultPinyinSoundInstructions,
  loadHhPinyinChart,
  loadHmmPinyinChart,
  loadMmPinyinChart,
  loadPylyPinyinChart,
  loadStandardPinyinChart,
  matchAllPinyinUnits,
  matchAllPinyinUnitsWithIndexes,
  normalizePinyinText,
  normalizePinyinUnit,
  normalizePinyinUnitForHintKey,
  pinyinUnitCount,
  pinyinUnitPattern,
  pinyinUnitSuggestions,
  splitPinyinUnit,
  splitPinyinUnitTone,
  splitPinyinUnitWithChart,
} from "#data/pinyin.ts";
import { loadPinyinWords } from "#dictionary.ts";
import { uniqueInvariant } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import { describe, expect, test } from "vitest";
import { 拼音 } from "./helpers";

test(`json data can be loaded and passes the schema validation`, async () => {
  await loadHhPinyinChart();
  await loadHmmPinyinChart();
  await loadMmPinyinChart();
  await loadStandardPinyinChart();
  loadPylyPinyinChart();
});

describe(
  `normalizePinyinUnit fixtures` satisfies HasNameOf<
    typeof normalizePinyinUnit
  >,
  () => {
    // Rules: (from https://en.wikipedia.org/wiki/Pinyin)
    // 1. If there is an a or an e, it will take the tone mark
    // 2. If there is an ou, then the o takes the tone mark
    // 3. Otherwise, the second vowel takes the tone mark

    test.for([
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
      // ü (as ascii u:)
      [`u:`, `ü`],
      [`u:1`, `ǖ`],
      [`u:2`, `ǘ`],
      [`u:3`, `ǚ`],
      [`u:4`, `ǜ`],
      [`u:5`, `ü`],

      // If there is an ou, then the o takes the tone mark
      [`dou`, `dou`],
      [`dou1`, `dōu`],
      [`dou2`, `dóu`],
      [`dou3`, `dǒu`],
      [`dou4`, `dòu`],
      [`dou5`, `dou`],

      // A few examples
      [`fa1`, `fā`],
      [`hao3`, `hǎo`],
      [`zhu5`, `zhu`],
      [`zi5`, `zi`],
      [`jiang1`, `jiāng`],
      [`jiang2`, `jiáng`],
      [`jiang3`, `jiǎng`],
      [`jiang4`, `jiàng`],
      [`jiang5`, `jiang`],
      [`r`, `r`],

      // Leaves diacritic forms as-is
      [`hǎo`, `hǎo`],
      [`nü`, `nü`],
      [`nǖ`, `nǖ`],
      [`nǘ`, `nǘ`],
      [`nǚ`, `nǚ`],
      [`nǜ`, `nǜ`],
      [`nü`, `nü`],
    ] as const)(`%s → %s`, ([input, expected]) => {
      expect(normalizePinyinUnit(input as PinyinUnit)).toEqual(expected);
    });
  },
);

describe(
  `normalizePinyinUnitForHintKey fixtures` satisfies HasNameOf<
    typeof normalizePinyinUnitForHintKey
  >,
  () => {
    test.for([
      [`huar2`, `huá`],
      [`huār`, `huā`],
      [`chuanr4`, `chuàn`],
      [`r`, `r`],
      [`er2`, `ér`],
      [`er5`, `er`],
    ] as const)(`%s → %s`, ([input, expected]) => {
      expect(normalizePinyinUnitForHintKey(input)).toEqual(expected);
    });
  },
);

describe(
  `normalizePinyinText fixtures` satisfies HasNameOf<
    typeof normalizePinyinText
  >,
  () => {
    // Rules: (from https://en.wikipedia.org/wiki/Pinyin)
    // 1. If there is an a or an e, it will take the tone mark
    // 2. If there is an ou, then the o takes the tone mark
    // 3. Otherwise, the second vowel takes the tone mark

    test.for([
      // Multiple single-unit words
      [`hǎo hao3 nü nv nu: nǖ nv1 nu:1`, `hǎo hǎo nü nü nü nǖ nǖ nǖ`],
      // Multiple multi-unit words
      [`hǎohao3 nü nvnu: nǖ nv1nu:1hao3`, `hǎohǎo nü nünü nǖ nǖnǖhǎo`],
      // Leaves punctuation alone
      [
        `hǎohao3. nü nvnu: nǖ 【nv1nu:1hao3】`,
        `hǎohǎo. nü nünü nǖ 【nǖnǖhǎo】`,
      ],
    ] as const)(`%s → %s`, ([input, expected]) => {
      expect(normalizePinyinText(input as PinyinUnit)).toEqual(expected);
    });
  },
);

describe(
  `splitPinyinUnitTone fixtures` satisfies HasNameOf<
    typeof splitPinyinUnitTone
  >,
  () => {
    test.for([
      [`niú`, [`niu`, 2]],
      [`hǎo`, [`hao`, 3]],
      [`nǖ`, [`nü`, 1]],
      [`nǘ`, [`nü`, 2]],
      [`nǚ`, [`nü`, 3]],
      [`nǜ`, [`nü`, 4]],
      [`nü`, [`nü`, 5]],
    ] as const)(`%s → %s`, ([input, [tonelessUnit, tone]]) => {
      expect(splitPinyinUnitTone(input as PinyinUnit)).toEqual({
        tonelessUnit,
        tone,
      });
    });
  },
);

describe(
  `splitPinyinUnit suite` satisfies HasNameOf<typeof splitPinyinUnit>,
  () => {
    // For all the tests, see tests for `loadPylyPinyinChart`.
    test.for([
      [`niú`, { tonelessUnit: `niu`, tone: 2 }],
      [`hǎo`, { tonelessUnit: `hao`, tone: 3 }],
      [`nǖ`, { tonelessUnit: `nü`, tone: 1 }],
      [`nǘ`, { tonelessUnit: `nü`, tone: 2 }],
      [`nǚ`, { tonelessUnit: `nü`, tone: 3 }],
      [`nǜ`, { tonelessUnit: `nü`, tone: 4 }],
      [`nü`, { tonelessUnit: `nü`, tone: 5 }],
      [`nu`, { tonelessUnit: `nu`, tone: 5 }],
    ] as const)(`%s → %s`, ([input, partial]) => {
      expect(splitPinyinUnit(input as PinyinUnit)).toMatchObject(partial);
    });
  },
);

describe(
  `pinyinUnitSuggestions suite` satisfies HasNameOf<
    typeof pinyinUnitSuggestions
  >,
  () => {
    test(`fixtures`, () => {
      const fixtures: [string, string[] | null][] = [
        [``, null],
        [` `, null],
        // Simple cases with no tone number or accent.
        [`ni`, [`0-2:nī:1`, `0-2:ní:2`, `0-2:nǐ:3`, `0-2:nì:4`, `0-2:ni:5`]],
        [
          `hao`,
          [`0-3:hāo:1`, `0-3:háo:2`, `0-3:hǎo:3`, `0-3:hào:4`, `0-3:hao:5`],
        ],
        // Even when there's a tone number, still allow searching by it so that
        // you can replace it with a different tone.
        [
          `hao3`,
          [`0-4:hāo:1`, `0-4:háo:2`, `0-4:hǎo:3`, `0-4:hào:4`, `0-4:hao:5`],
        ],
        // Support tone accents, allowing the accent to be swapped.
        [
          `hǎo`,
          [`0-3:hāo:1`, `0-3:háo:2`, `0-3:hǎo:3`, `0-3:hào:4`, `0-3:hao:5`],
        ],
        // Multiple units, should match the last unit.
        [
          `nihao`,
          [`2-5:hāo:1`, `2-5:háo:2`, `2-5:hǎo:3`, `2-5:hào:4`, `2-5:hao:5`],
        ],
        // Multiple units but with trailing space, shouldn't match as the
        // space is a separator.
        [`nihao `, null],
        // v / ü
        [`nv`, [`0-2:nǖ:1`, `0-2:nǘ:2`, `0-2:nǚ:3`, `0-2:nǜ:4`, `0-2:nü:5`]], // v is treated as ü
        [`nü`, [`0-2:nǖ:1`, `0-2:nǘ:2`, `0-2:nǚ:3`, `0-2:nǜ:4`, `0-2:nü:5`]],
      ];

      for (const [query, results] of fixtures) {
        const result = pinyinUnitSuggestions(query);
        expect({
          query,
          results:
            result == null
              ? null
              : result.units.map(
                  (x) =>
                    `${result.from}-${result.to}:${x.pinyinUnit}:${x.tone}`,
                ),
        }).toEqual({
          query,
          results,
        });
      }
    });

    test(`should not throw on invalid input`, () => {
      expect(pinyinUnitSuggestions(`xxxx`)).toEqual(null);
    });
  },
);

const pinyinWithIndexesFixtures: [string, (number | string)[]][] = [
  // Units
  [`nv`, [0, `nv`]],
  [`nv1`, [0, `nv1`]],
  [`hao`, [0, `hao`]],
  [`hǎo`, [0, `hǎo`]],
  [`hao3`, [0, `hao3`]],
  [`ni`, [0, `ni`]],
  [`ní`, [0, `ní`]],
  [`nì`, [0, `nì`]],
  [`nǐ`, [0, `nǐ`]],
  [`nī`, [0, `nī`]],
  [`ni0`, [0, `ni0`]],
  [`ni1`, [0, `ni1`]],
  [`ni2`, [0, `ni2`]],
  [`ni3`, [0, `ni3`]],
  [`ni4`, [0, `ni4`]],
  [`ni5`, [0, `ni5`]],
  [`r`, [0, `r`]],
  // Words
  [`nǐhǎo`, [0, `nǐ`, 2, `hǎo`]],
  [`nǐ·hǎo`, [0, `nǐ`, 3, `hǎo`]], // \u00B7 MIDDLE DOT
  [`nǐ‧hǎo`, [0, `nǐ`, 3, `hǎo`]], // \u2027 HYPHENATION POINT
  // Sentences
  [`nǐ hǎo`, [0, `nǐ`, 3, `hǎo`]],
  [`Bù yīhuǐ'er`, [0, `Bù`, 3, `yī`, 5, `huǐ`, 9, `er`]],
  [`bù yīhuǐr`, [0, `bù`, 3, `yī`, 5, `huǐ`, 8, `r`]],
];

describe(
  `matchAllPinyinUnits suite` satisfies HasNameOf<typeof matchAllPinyinUnits>,
  () => {
    test(`pinyinUnitPattern`, () => {
      const valid = [
        `ni`,
        `ní`,
        `nì`,
        `nǐ`,
        `nī`,
        `ni0`,
        `ni1`,
        `ni2`,
        `ni3`,
        `ni4`,
        `ni5`,
      ];
      const regex = new RegExp(pinyinUnitPattern);
      for (const text of valid) {
        const match = regex.exec(text);
        expect(match?.at(0)).toEqual(text);
      }
    });

    test(`fixtures`, () => {
      for (const [input, expected] of pinyinWithIndexesFixtures) {
        const actual = matchAllPinyinUnits(input);
        expect([input, actual]).toEqual([
          input,
          expected
            // strip out the indexes to re-use the same fixture data
            .filter((_, i) => i % 2 === 1),
        ]);
      }
    });
  },
);

describe(
  `matchAllPinyinUnitsWithIndexes suite` satisfies HasNameOf<
    typeof matchAllPinyinUnitsWithIndexes
  >,
  () => {
    test(`fixtures`, () => {
      for (const [input, expected] of pinyinWithIndexesFixtures) {
        const actual = matchAllPinyinUnitsWithIndexes(input);
        expect([input, actual]).toEqual([input, expected]);
      }
    });
  },
);

test(`standard pinyin covers kangxi pinyin`, async () => {
  const chart = await loadStandardPinyinChart();

  await testPinyinChart(chart, [
    [`a`, `∅-`, `-a`],
    [`an`, `∅-`, `-an`],
    [`ê`, `∅-`, `-ê`],
    [`ju`, `j-`, `-ü`],
    [`qu`, `q-`, `-ü`],
    [`xu`, `x-`, `-ü`],
    [`bu`, `b-`, `-u`],
    [`pu`, `p-`, `-u`],
    [`mu`, `m-`, `-u`],
    [`fu`, `f-`, `-u`],
    [`du`, `d-`, `-u`],
    [`tu`, `t-`, `-u`],
    [`nu`, `n-`, `-u`],
    [`niu`, `n-`, `-iu`],
    [`lu`, `l-`, `-u`],
    [`gu`, `g-`, `-u`],
    [`ku`, `k-`, `-u`],
    [`hu`, `h-`, `-u`],
    [`wu`, `∅-`, `-u`],
    [`wa`, `∅-`, `-ua`],
    [`er`, `∅-`, `-er`],
    [`yi`, `∅-`, `-i`],
    [`ya`, `∅-`, `-ia`],
    [`yo`, `∅-`, `-io`],
    [`ye`, `∅-`, `-ie`],
    [`yai`, `∅-`, `-iai`],
    [`yao`, `∅-`, `-iao`],
    [`you`, `∅-`, `-iu`],
    [`yan`, `∅-`, `-ian`],
    [`yin`, `∅-`, `-in`],
    [`yang`, `∅-`, `-iang`],
    [`ying`, `∅-`, `-ing`],
    [`wu`, `∅-`, `-u`],
    [`wa`, `∅-`, `-ua`],
    [`wo`, `∅-`, `-uo`],
    [`wai`, `∅-`, `-uai`],
    [`wei`, `∅-`, `-ui`],
    [`wan`, `∅-`, `-uan`],
    [`wen`, `∅-`, `-un`],
    [`wang`, `∅-`, `-uang`],
    [`weng`, `∅-`, `-ong`],
    [`ong`, `∅-`, `-ong`],
    [`yu`, `∅-`, `-ü`],
    [`yue`, `∅-`, `-üe`],
    [`yuan`, `∅-`, `-üan`],
    [`yun`, `∅-`, `-ün`],
    [`yong`, `∅-`, `-iong`],
    [`ju`, `j-`, `-ü`],
    [`jue`, `j-`, `-üe`],
    [`juan`, `j-`, `-üan`],
    [`jun`, `j-`, `-ün`],
    [`jiong`, `j-`, `-iong`],
    [`qu`, `q-`, `-ü`],
    [`que`, `q-`, `-üe`],
    [`quan`, `q-`, `-üan`],
    [`qun`, `q-`, `-ün`],
    [`qiong`, `q-`, `-iong`],
    [`xu`, `x-`, `-ü`],
    [`xue`, `x-`, `-üe`],
    [`xuan`, `x-`, `-üan`],
    [`xun`, `x-`, `-ün`],
    [`xiong`, `x-`, `-iong`],
  ]);
});

test(`mm pinyin covers kangxi pinyin`, async () => {
  const chart = await loadMmPinyinChart();

  await testPinyinChart(chart, [
    [`zhang`, `zh-`, `-ang`],
    [`bao`, `b-`, `-ao`],
    [`ao`, `∅-`, `-ao`],
    [`ba`, `b-`, `-a`],
    [`ci`, `c-`, `-∅`],
    [`chi`, `ch-`, `-∅`],
    [`cong`, `cu-`, `-(e)ng`],
    [`chong`, `chu-`, `-(e)ng`],
    [`chui`, `chu-`, `-ei`],
    [`diu`, `di-`, `-ou`],
    [`miu`, `mi-`, `-ou`],
    [`niu`, `ni-`, `-ou`],
    [`you`, `y-`, `-ou`],
    [`yin`, `y-`, `-(e)n`],
    [`ê`, `∅-`, `-e`],
    [`er`, `∅-`, `-∅`],
    [`zha`, `zh-`, `-a`],
    [`zhong`, `zhu-`, `-(e)ng`],
    [`zhe`, `zh-`, `-e`],
    [`ta`, `t-`, `-a`],
    [`a`, `∅-`, `-a`],
    [`xing`, `xi-`, `-(e)ng`],
    [`qing`, `qi-`, `-(e)ng`],
    [`si`, `s-`, `-∅`],
    [`zhi`, `zh-`, `-∅`],
    [`chi`, `ch-`, `-∅`],
    [`shi`, `sh-`, `-∅`],
    [`ri`, `r-`, `-∅`],
    [`ci`, `c-`, `-∅`],
    [`zi`, `z-`, `-∅`],
  ]);
});

test(`hh pinyin covers kangxi pinyin`, async () => {
  const chart = await loadHhPinyinChart();

  await testPinyinChart(
    chart,
    [
      [`a`, `_-`, `-a`],
      [`bi`, `bi-`, `-_`],
      [`niu`, `ni-`, `-(o)u`],
      [`tie`, `ti-`, `-e`],
      [`zhou`, `zh-`, `-(o)u`],
      [`zhuo`, `zhu-`, `-o`],
    ],
    new Set([
      `ê`,
      `biang`,
      `ong`,
      `pia`,
      `pun`,
      `fai`,
      `fiao`,
      `din`,
      `diang`,
      `duang`,
      `nia`,
      `nui`,
      `nun`,
      `len`,
      `lüan`,
      `lün`,
      `gin`,
      `ging`,
      `kei`,
      `kiu`,
      `kiang`,
      `cei`,
      `sei`,
    ]),
  );
});

test(`hmm pinyin covers kangxi pinyin`, async () => {
  const chart = await loadHmmPinyinChart();

  expect(new Set(Object.values(chart.unitToInitialSound)).size).toEqual(55);
  expect(new Set(Object.values(chart.unitToFinalSound)).size).toEqual(13);

  await testPinyinChart(chart, [
    [`a`, `∅-`, `-a`],
    [`er`, `∅-`, `-∅`],
    [`ci`, `c-`, `-∅`],
    [`yi`, `yi-`, `-∅`],
    [`ya`, `yi-`, `-a`],
    [`wa`, `wu-`, `-a`],
    [`wu`, `wu-`, `-∅`],
    [`bi`, `bi-`, `-∅`],
    [`bin`, `bi-`, `-(e)n`],
    [`meng`, `m-`, `-(e)ng`],
    [`ming`, `mi-`, `-(e)ng`],
    [`li`, `li-`, `-∅`],
    [`diu`, `di-`, `-ou`],
    [`niu`, `ni-`, `-ou`],
    [`lu`, `lu-`, `-∅`],
    [`lü`, `lü-`, `-∅`],
    [`tie`, `ti-`, `-e`],
    [`zhou`, `zh-`, `-ou`],
    [`zhuo`, `zhu-`, `-o`],
    [`shua`, `shu-`, `-a`],
  ]);
});

describe(`pyly pinyin chart`, async () => {
  test(`sound group ID consistency`, async () => {
    const chart = loadPylyPinyinChart();

    const chartGroupIds = new Set(chart.soundGroups.map((x) => x.id));
    expect(chartGroupIds).toEqual(
      new Set(Object.keys(defaultPinyinSoundGroupRanks)),
    );
    expect(chartGroupIds).toEqual(
      new Set(Object.keys(defaultPinyinSoundGroupNames)),
    );
    expect(chartGroupIds).toEqual(
      new Set(Object.keys(defaultPinyinSoundGroupThemes)),
    );
  });

  test(`sound ID consistency`, async () => {
    const chart = loadPylyPinyinChart();

    const chartSoundIds = new Set(chart.soundGroups.flatMap((x) => x.sounds));
    expect(chartSoundIds).toEqual(
      new Set(Object.keys(defaultPinyinSoundInstructions)),
    );
  });

  test(`standard tests`, async () => {
    const chart = loadPylyPinyinChart();
    await testPinyinChart(chart, [
      [`zhang`, `zh-`, `-ang`],
      [`bao`, `b-`, `-ao`],
      [`ao`, `∅-`, `-ao`],
      [`ba`, `b-`, `-a`],

      [`gong`, `g-`, `-ong`],
      [`cong`, `c-`, `-ong`],

      [`hui`, `hu-`, `-ei`],

      // https://countryoftheblind.blogspot.com/2012/01/mnemonics-for-pronouncing-chinese.html?showComment=1540670199273&m=1#c4879970812355082477
      [`cheng`, `ch-`, `-eng`],
      [`chong`, `ch-`, `-ong`],

      [`chui`, `chu-`, `-ei`],
      [`diu`, `di-`, `-ou`],
      [`miu`, `mi-`, `-ou`],
      [`niu`, `ni-`, `-ou`],
      [`you`, `y-`, `-ou`],
      [`yin`, `y-`, `-en`],
      [`ê`, `∅-`, `-e`],
      [`er`, `∅-`, `-∅`],

      [`nü`, `nü-`, `-∅`],

      // When -i- is not an "ee" sound:
      //
      // > the "i" in Pinyin "si" is nothing like the "i" in "yi" or "ji". "Si" is
      // > pronounced more like "sz" than English "sea". Same for "zhi", "chi",
      // > "shi", "ri", "ci", "zi".
      //
      // Source:
      // https://countryoftheblind.blogspot.com/2012/01/mnemonics-for-pronouncing-chinese.html?m=1
      [`si`, `s-`, `-∅`],
      [`zhi`, `zh-`, `-∅`],
      [`chi`, `ch-`, `-∅`],
      [`shi`, `sh-`, `-∅`],
      [`ri`, `r-`, `-∅`],
      [`ci`, `c-`, `-∅`],
      [`zi`, `z-`, `-∅`],
      [`qi`, `qi-`, `-∅`],

      [`zha`, `zh-`, `-a`],
      // > You will notice some spelling oddities: for example, zhu- + (e)ng becomes
      // > zhong instead of *zhung, but these merely reflect the way Pinyin works.
      //
      // Source: https://countryoftheblind.blogspot.com/2012/01/mnemonics-for-pronouncing-chinese.html?m=1
      [`zhong`, `zh-`, `-ong`],
      [`zhe`, `zh-`, `-e`],
      [`ta`, `t-`, `-a`],
      [`tou`, `t-`, `-ou`],
      [`xiu`, `xi-`, `-ou`],
      [`mao`, `m-`, `-ao`],
      [`a`, `∅-`, `-a`],
      [`an`, `∅-`, `-an`],
      [`xing`, `xi-`, `-eng`],
      [`qing`, `qi-`, `-eng`],
    ]);
  });
});

describe(
  `pinyinUnitCount suite` satisfies HasNameOf<typeof pinyinUnitCount>,
  () => {
    test.for([
      [拼音`hǎo`, 1],
      [拼音`nǐ hǎo`, 2],
      [拼音`nǐ  hǎo`, 2],
      [拼音`māma`, 2],
      [拼音`nǐ hǎo māma`, 4],
      [拼音``, 0],
      [拼音`   `, 0],
      [拼音`  nǐ hǎo  `, 2],
      [拼音`yǒu yī diǎn r`, 4],
      [拼音`bù yīhuǐ'er`, 4],
      [拼音`Bù yīhuǐ'er`, 4],
    ] as const)(`%s → %s`, ([pinyin, count]) => {
      expect(pinyinUnitCount(pinyin)).toBe(count);
    });
  },
);

async function testPinyinChart(
  chart: DeepReadonly<PinyinChart>,
  testCases: readonly [
    input: string,
    expectedInitialChartLabel: string,
    expectedFinalChartLabel: string,
  ][] = [],
  expectedDifferenceFromStandard = new Set(),
): Promise<void> {
  const standardChart = await loadStandardPinyinChart();
  const pinyinWords = await loadPinyinWords();

  // Start with test cases first as these are easier to debug.
  for (const [
    input,
    expectedInitialChartLabel,
    expectedFinalChartLabel,
  ] of testCases) {
    const actual = splitPinyinUnitWithChart(input as PinyinUnit, chart);
    expect
      .soft(
        {
          initialChartLabel: actual?.initialSoundId,
          finalChartLabel: actual?.finalSoundId,
        },
        `input: ${input}`,
      )
      .toEqual({
        initialChartLabel: expectedInitialChartLabel,
        finalChartLabel: expectedFinalChartLabel,
      });
  }

  for (const x of pinyinWords) {
    expect(
      expectedDifferenceFromStandard.has(x) ||
        splitPinyinUnitWithChart(x as PinyinUnit, chart),
    ).not.toEqual(null);
  }

  // Ensure that there are no duplicates initials or finals.
  expect(Object.keys(chart.unitToInitialSound).sort()).toEqual(
    Object.keys(chart.unitToFinalSound).sort(),
  );

  // Ensure all the pinyin units in the standard chart are covered by this
  // chart.
  expect(
    new Set(Object.keys(chart.unitToInitialSound))
      .symmetricDifference(
        new Set(Object.keys(standardChart.unitToInitialSound)),
      )
      .symmetricDifference(expectedDifferenceFromStandard),
  ).toEqual(new Set());

  // Test that there are no duplicated group items.
  uniqueInvariant(chart.soundGroups.flatMap((x) => x.sounds));

  // Test that all the group items are valid and cover all the listed items.
  expect(
    new Set(
      chart.soundGroups
        .flatMap((x) => x.sounds)
        .filter((x) => !`1 2 3 4 5`.includes(x)),
    ),
  ).toEqual(
    new Set([
      ...Object.values(chart.unitToInitialSound),
      ...Object.values(chart.unitToFinalSound),
    ]),
  );
}
