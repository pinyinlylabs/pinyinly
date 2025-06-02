import {
  convertPinyinWithToneNumberToToneMark,
  parsePinyinSyllableTone,
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
      assert.deepEqual(parsePinyinSyllableTone(input), expected);
    }
  });
});
