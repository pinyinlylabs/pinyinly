import {
  convertPinyinWithToneNumberToToneMark,
  matchAllPinyinSyllables,
  matchAllPinyinSyllablesWithIndexes,
  parsePinyinSyllable,
  parsePinyinSyllableTone,
  pinyinSyllablePattern,
  pinyinSyllableSuggestions,
} from "#data/pinyin.ts";
import assert from "node:assert/strict";
import test from "node:test";

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
    [`fa1`, `fā`],
    [`hao3`, `hǎo`],
    [`zhu5`, `zhu`],
    [`zi5`, `zi`],
    [`jiang1`, `jiāng`],
    [`jiang2`, `jiáng`],
    [`jiang3`, `jiǎng`],
    [`jiang4`, `jiàng`],
    [`jiang5`, `jiang`],
  ] as const) {
    assert.equal(convertPinyinWithToneNumberToToneMark(input), expected);
  }
});

await test(`${parsePinyinSyllableTone.name} fixtures`, async () => {
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
      const [tonelessPinyin, tone] = expected;
      assert.deepEqual(parsePinyinSyllableTone(input), {
        tonelessPinyin,
        tone,
      });
    }
  });
});

await test(`${parsePinyinSyllable.name} suite`, async () => {
  await test(`fixtures`, () => {
    expect(parsePinyinSyllable(``)).toBeNull();
  });
});

await test(`${pinyinSyllableSuggestions.name} suite`, async () => {
  await test(`fixtures`, () => {
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
      // Multiple syllables, should match the last syllable.
      [
        `nihao`,
        [`2-5:hāo:1`, `2-5:háo:2`, `2-5:hǎo:3`, `2-5:hào:4`, `2-5:hao:5`],
      ],
      // Multiple syllables but with trailing space, shouldn't match as the
      // space is a separator.
      [`nihao `, null],
      // v / ü
      [`nv`, [`0-2:nǖ:1`, `0-2:nǘ:2`, `0-2:nǚ:3`, `0-2:nǜ:4`, `0-2:nü:5`]], // v is treated as ü
      [`nü`, [`0-2:nǖ:1`, `0-2:nǘ:2`, `0-2:nǚ:3`, `0-2:nǜ:4`, `0-2:nü:5`]],
    ];

    for (const [query, results] of fixtures) {
      const result = pinyinSyllableSuggestions(query);
      expect({
        query,
        results:
          result == null
            ? null
            : result.syllables.map(
                (x) =>
                  `${result.from}-${result.to}:${x.pinyinSyllable}:${x.tone}`,
              ),
      }).toEqual({
        query,
        results,
      });
    }
  });

  await test(`should not throw on invalid input`, () => {
    expect(pinyinSyllableSuggestions(`xxxx`)).toEqual(null);
  });
});

const pinyinWithIndexesFixtures: [string, (number | string)[]][] = [
  // Syllables
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
];

await test(`${matchAllPinyinSyllables.name} suite`, async () => {
  await test(`pinyinSyllablePattern`, async () => {
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
    const regex = new RegExp(pinyinSyllablePattern);
    for (const text of valid) {
      const match = regex.exec(text);
      assert.equal(match?.at(0), text);
    }
  });

  await test(`fixtures`, () => {
    for (const [input, expected] of pinyinWithIndexesFixtures) {
      const actual = matchAllPinyinSyllables(input);
      expect([input, actual]).toEqual([
        input,
        expected
          // strip out the indexes to re-use the same fixture data
          .filter((_, i) => i % 2 === 1),
      ]);
    }
  });
});

await test(`${matchAllPinyinSyllablesWithIndexes.name} suite`, async () => {
  await test(`fixtures`, () => {
    for (const [input, expected] of pinyinWithIndexesFixtures) {
      const actual = matchAllPinyinSyllablesWithIndexes(input);
      expect([input, actual]).toEqual([input, expected]);
    }
  });
});
