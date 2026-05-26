// pyly-not-src-test
import type { HanziText, PinyinNumericText } from "#data/model.js";
import { describe, expect, test } from "vitest";
import {
  applyCedictV2EditsToText,
  applyCedictV2UnicodeNormalization,
  buildCedictStableSenseId,
  buildCedictV2SenseIdsText,
  buildCedictSenseId,
  computeGlossesSimilarity,
  parseCedictStableSenseId,
  parseCedictV2IdsText,
  parseCedictV2EditsText,
  findCedictEntryById,
  findCedictMigratedSenseId,
  findCedictSensesForHanziWordMeaning,
  findCedictSenseById,
  loadCedictV2,
  parseCedictV2Line,
  parseCedictV2Text,
  parseCedictSenseId,
  transformCedictV2Entry,
  serializeCedictV2Sense,
  parseCedictV2Sense,
  nestedStringSetScorer,
} from "./cedict";
import pick from "lodash/pick.js";

describe(`parseCedictV2Line`, () => {
  test(`returns null for comments and blank lines`, () => {
    expect(parseCedictV2Line(`# CC-CEDICT`)).toBeNull();
    expect(parseCedictV2Line(`   `)).toBeNull();
  });

  test(`parses a simple v2 line`, () => {
    const line = `110 110 [[yao1 yao1 ling2]] /the emergency number for law enforcement in Mainland China and Taiwan/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "yao1 yao1 ling2",
        "senses": [
          "the emergency number for law enforcement in Mainland China and Taiwan",
        ],
        "simplified": "110",
        "traditional": "110",
      }
    `);
  });

  test(`does not normalize compatibility hanzi in parsed line headers`, () => {
    const parsed = parseCedictV2Line(
      `〸 〸 [[shi2]] /numeral 10 in the Suzhou numeral system 蘇州碼子|苏州码子[Su1zhou1 ma3zi5]/`,
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.traditional).toBe(`〸`);
    expect(parsed?.simplified).toBe(`〸`);
    expect(parsed?.traditional).not.toBe(`十`);
    expect(parsed?.simplified).not.toBe(`十`);
  });

  test(`keeps standalone also-pr pronunciation senses in syntax parse`, () => {
    const line = `三更 三更 [[san1geng1]] /third of the five night watch periods 23:00-01:00 (old)/midnight/also pr. [san1 jin1]/`;

    const parsed = parseCedictV2Line(line);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "san1geng1",
        "senses": [
          "third of the five night watch periods 23:00-01:00 (old)",
          "midnight",
          "also pr. [san1 jin1]",
        ],
        "simplified": "三更",
        "traditional": "三更",
      }
    `);
  });

  test(`parses slash-separated senses and semicolon-separated glosses`, () => {
    const line = `3D打印 3D打印 [[san1-D da3yin4]] /to 3D print; 3D printing/sense 2/sense 3A; sense 3B/`;

    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "to 3D print; 3D printing",
        "sense 2",
        "sense 3A; sense 3B",
      ]
    `);
  });

  test(`parses line with empty pinyin`, () => {
    const line = `龜 龜 [[]] /turtle/`;
    const parsed = parseCedictV2Line(line);

    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "",
        "senses": [
          "turtle",
        ],
        "simplified": "龜",
        "traditional": "龜",
      }
    `);
  });

  test(`throws for malformed lines in strict mode`, () => {
    expect(() =>
      parseCedictV2Line(`not a cedict line`, { lineNumber: 42 }),
    ).toThrow(`invalid CC-CEDICT v2 line (line 42)`);
  });

  test(`returns null for malformed lines in lenient mode`, () => {
    expect(
      parseCedictV2Line(`not a cedict line`, { strict: false }),
    ).toBeNull();
  });

  test(`applies replacement edits before sense parsing`, () => {
    const edits = parseCedictV2EditsText(
      [`小二 小二 [[xiao3'er4]]`, `/old sense 1/ /new sense 1/`, ``].join(`\n`),
    );

    const parsed = parseCedictV2Line(
      `小二 小二 [[xiao3'er4]] /old sense 1/old sense 2/`,
      { edits },
    );

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "new sense 1",
        "old sense 2",
      ]
    `);
  });

  test(`applies replacement edits that split one sense into multiple senses`, () => {
    const edits = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/one,two/ /one/two/`, ``].join(`\n`),
    );

    const parsed = parseCedictV2Line(`示例 示例 [[shi4li4]] /one,two/three/`, {
      edits,
    });

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "one",
        "two",
        "three",
      ]
    `);
  });

  test(`applies merge edits that combine two senses into one`, () => {
    const edits = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/gloss 1/ += /gloss 2; gloss 3/`, ``].join(
        `\n`,
      ),
    );

    const parsed = parseCedictV2Line(
      `示例 示例 [[shi4li4]] /gloss 1/gloss 2; gloss 3/gloss 4/`,
      {
        edits,
      },
    );

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "gloss 1; gloss 2; gloss 3",
        "gloss 4",
      ]
    `);
  });

  test(`applies merge edits that combine three senses into one`, () => {
    const edits = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/gloss 1/ += /gloss 2/ += /gloss 3/`, ``].join(
        `\n`,
      ),
    );

    const parsed = parseCedictV2Line(
      `示例 示例 [[shi4li4]] /gloss 1/gloss 2/gloss 3/gloss 4/`,
      {
        edits,
      },
    );

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "gloss 1; gloss 2; gloss 3",
        "gloss 4",
      ]
    `);
  });

  test(`applies deletion edits before sense parsing`, () => {
    const edits = parseCedictV2EditsText(
      [`小二 小二 [[xiao3'er4]]`, `/old sense 1/ //`, ``].join(`\n`),
    );

    const parsed = parseCedictV2Line(
      `小二 小二 [[xiao3'er4]] /old sense 1/old sense 2/`,
      { edits },
    );

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "old sense 2",
      ]
    `);
  });

  test(`throws in strict mode when edits do not match`, () => {
    const edits = parseCedictV2EditsText(
      [`小二 小二 [[xiao3'er4]]`, `/missing sense/ /new sense/`, ``].join(`\n`),
    );

    expect(() =>
      parseCedictV2Line(`小二 小二 [[xiao3'er4]] /old sense 1/`, {
        edits,
      }),
    ).toThrow(`edits rule did not match sense: missing sense`);
  });

  test(`skips unmatched edits in lenient mode`, () => {
    const edits = parseCedictV2EditsText(
      [`小二 小二 [[xiao3'er4]]`, `/missing sense/ /new sense/`, ``].join(`\n`),
    );

    const parsed = parseCedictV2Line(`小二 小二 [[xiao3'er4]] /old sense 1/`, {
      strict: false,
      edits,
    });

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "old sense 1",
      ]
    `);
  });

  test(`throws in strict mode when merge edits do not match`, () => {
    const edits = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/gloss 1/ += /missing gloss/`, ``].join(`\n`),
    );

    expect(() =>
      parseCedictV2Line(`示例 示例 [[shi4li4]] /gloss 1/gloss 2/`, {
        edits,
      }),
    ).toThrow(`edits rule did not match sense: missing gloss`);
  });

  test(`skips unmatched merge edits in lenient mode`, () => {
    const edits = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/gloss 1/ += /missing gloss/`, ``].join(`\n`),
    );

    const parsed = parseCedictV2Line(
      `示例 示例 [[shi4li4]] /gloss 1/gloss 2/`,
      {
        strict: false,
        edits,
      },
    );

    expect(parsed?.senses).toMatchInlineSnapshot(`
      [
        "gloss 1",
        "gloss 2",
      ]
    `);
  });

  test(`throws when one edits rule matches multiple senses`, () => {
    const edits = parseCedictV2EditsText(
      [`小二 小二 [[xiao3'er4]]`, `/same sense/ /new sense/`, ``].join(`\n`),
    );

    expect(() =>
      parseCedictV2Line(`小二 小二 [[xiao3'er4]] /same sense/same sense/`, {
        edits,
      }),
    ).toThrow(`edits rule matched multiple senses: same sense`);
  });
});

describe(`parseCedictV2EditsText`, () => {
  test(`gracefully parses an empty edits file`, () => {
    const parsed = parseCedictV2EditsText(``);

    expect(parsed.entriesByKey.size).toBe(0);
    expect([...parsed.entriesByKey.values()]).toEqual([]);
  });

  test(`parses valid edits blocks`, () => {
    const parsed = parseCedictV2EditsText(
      [
        `小二 小二 [[xiao3'er4]]`,
        `/old sense 1/ /new sense 1/`,
        `/old sense 2/ //`,
        ``,
      ].join(`\n`),
    );

    expect(parsed.entriesByKey.size).toBe(1);
    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry).toMatchInlineSnapshot(`
      {
        "pinyin": "xiao3'er4",
        "rules": [
          {
            "kind": "replace",
            "newSense": "new sense 1",
            "oldSense": "old sense 1",
          },
          {
            "kind": "replace",
            "newSense": "",
            "oldSense": "old sense 2",
          },
        ],
        "simplified": "小二",
        "traditional": "小二",
      }
    `);
  });

  test(`parses replacement values containing slash separators`, () => {
    const parsed = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/one,two/ /one/two/`, ``].join(`\n`),
    );

    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry?.rules).toEqual([
      { kind: `replace`, oldSense: `one,two`, newSense: `one/two` },
    ]);
  });

  test(`parses merge rules`, () => {
    const parsed = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/gloss 1/ += /gloss 2; gloss 3/`, ``].join(
        `\n`,
      ),
    );

    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry?.rules).toEqual([
      {
        kind: `merge`,
        oldSenses: [`gloss 1`, `gloss 2; gloss 3`],
        mergedSense: `gloss 1; gloss 2; gloss 3`,
      },
    ]);
  });

  test(`parses add rules and empty-pinyin headers`, () => {
    const parsed = parseCedictV2EditsText(
      [`龜 龜 [[]]`, `+ /turtle/`, ``].join(`\n`),
    );

    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry).toEqual({
      traditional: `龜`,
      simplified: `龜`,
      pinyin: ``,
      rules: [{ kind: `add`, newSense: `turtle` }],
    });
  });

  test(`allows comment lines in the middle of an edits block`, () => {
    const parsed = parseCedictV2EditsText(
      [
        `車上 车上 [[che1 shang4]]`,
        `# https://www.dong-chinese.com/wiki/车上`,
        `+ /in a car; aboard/`,
        ``,
      ].join(`\n`),
    );

    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry).toEqual({
      traditional: `車上`,
      simplified: `车上`,
      pinyin: `che1 shang4`,
      rules: [{ kind: `add`, newSense: `in a car; aboard` }],
    });
  });

  test(`parses multiple edit blocks for different entries`, () => {
    const parsed = parseCedictV2EditsText(
      [
        `小二 小二 [[xiao3'er4]]`,
        `/old sense 1/ /new sense 1/`,
        ``,
        `三更 三更 [[san1geng1]]`,
        `/midnight/ /late night/`,
        ``,
      ].join(`\n`),
    );

    expect(parsed.entriesByKey.size).toBe(2);

    const entries = [...parsed.entriesByKey.values()];
    expect(entries).toMatchInlineSnapshot(`
      [
        {
          "pinyin": "xiao3'er4",
          "rules": [
            {
              "kind": "replace",
              "newSense": "new sense 1",
              "oldSense": "old sense 1",
            },
          ],
          "simplified": "小二",
          "traditional": "小二",
        },
        {
          "pinyin": "san1geng1",
          "rules": [
            {
              "kind": "replace",
              "newSense": "late night",
              "oldSense": "midnight",
            },
          ],
          "simplified": "三更",
          "traditional": "三更",
        },
      ]
    `);
  });

  test(`does not collapse compatibility hanzi in headers`, () => {
    const parsed = parseCedictV2EditsText(
      [
        `〸 〸 [[shi2]]`,
        `/numeral 10 in the Suzhou numeral system 蘇州碼子|苏州码子[Su1zhou1 ma3zi5]/ /Suzhou numeral ten/`,
        ``,
        `十 十 [[shi2]]`,
        `/ten/ /ten (cardinal number)/`,
        ``,
      ].join(`\n`),
    );

    expect(parsed.entriesByKey.size).toBe(2);
    expect(parsed.entriesByKey.get(`〸|〸|shi2`)?.rules[0])
      .toMatchInlineSnapshot(`
      {
        "kind": "replace",
        "newSense": "Suzhou numeral ten",
        "oldSense": "numeral 10 in the Suzhou numeral system 蘇州碼子|苏州码子[Su1zhou1 ma3zi5]",
      }
    `);
    expect(parsed.entriesByKey.get(`十|十|shi2`)?.rules[0]).toEqual({
      kind: `replace`,
      oldSense: `ten`,
      newSense: `ten (cardinal number)`,
    });
  });

  test(`throws on malformed header lines`, () => {
    expect(() =>
      parseCedictV2EditsText(
        [`小二 小二 [xiao3'er4]`, `/old/ /new/`, ``].join(`\n`),
      ),
    ).toThrow(`invalid edits header line (line 1)`);
  });

  test(`throws on malformed rule lines`, () => {
    expect(() =>
      parseCedictV2EditsText(
        [`小二 小二 [[xiao3'er4]]`, `/old/ new`, ``].join(`\n`),
      ),
    ).toThrow(`invalid edits rule line (line 2)`);
  });

  test(`throws on malformed merge rule lines`, () => {
    expect(() =>
      parseCedictV2EditsText(
        [`示例 示例 [[shi4li4]]`, `/gloss 1/ += gloss 2/`, ``].join(`\n`),
      ),
    ).toThrow(`invalid edits rule line (line 2)`);
  });

  test(`throws on duplicate edit blocks`, () => {
    expect(() =>
      parseCedictV2EditsText(
        [
          `小二 小二 [[xiao3'er4]]`,
          `/old sense 1/ /new sense 1/`,
          ``,
          `小二 小二 [[xiao3'er4]]`,
          `/old sense 2/ /new sense 2/`,
          ``,
        ].join(`\n`),
      ),
    ).toThrow(`duplicate edit block for 小二 小二 [[xiao3'er4]] (line 4)`);
  });
});

describe(`parseCedictV2IdsText`, () => {
  test(`gracefully parses an empty ids file`, () => {
    const parsed = parseCedictV2IdsText(``);

    expect(parsed.entriesByKey.size).toBe(0);
    expect([...parsed.entriesByKey.values()]).toEqual([]);
  });

  test(`parses valid ids blocks`, () => {
    const parsed = parseCedictV2IdsText(
      [
        `小二 小二 [[xiao3'er4]]`,
        `abc12 /new sense 1/`,
        `def34 /old sense 2/`,
        ``,
      ].join(`\n`),
    );

    expect(parsed.entriesByKey.size).toBe(1);
    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry).toEqual({
      traditional: `小二`,
      simplified: `小二`,
      pinyin: `xiao3'er4`,
      rules: [
        { nanoid: `abc12`, sense: `new sense 1` },
        { nanoid: `def34`, sense: `old sense 2` },
      ],
    });
  });

  test(`allows comment lines in the middle of an ids block`, () => {
    const parsed = parseCedictV2IdsText(
      [
        `車上 车上 [[che1 shang4]]`,
        `# https://www.dong-chinese.com/wiki/车上`,
        `a1B2c /in a car; aboard/`,
        ``,
      ].join(`\n`),
    );

    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry).toEqual({
      traditional: `車上`,
      simplified: `车上`,
      pinyin: `che1 shang4`,
      rules: [{ nanoid: `a1B2c`, sense: `in a car; aboard` }],
    });
  });

  test(`throws on malformed header lines`, () => {
    expect(() =>
      parseCedictV2IdsText(
        [`小二 小二 [xiao3'er4]`, `abc12 /old/`, ``].join(`\n`),
      ),
    ).toThrow(`invalid edits header line (line 1)`);
  });

  test(`throws on malformed ids rule lines`, () => {
    expect(() =>
      parseCedictV2IdsText(
        [`小二 小二 [[xiao3'er4]]`, `abc12 old sense`, ``].join(`\n`),
      ),
    ).toThrow(`invalid ids rule line (line 2)`);
  });

  test(`throws on duplicate ids blocks`, () => {
    expect(() =>
      parseCedictV2IdsText(
        [
          `小二 小二 [[xiao3'er4]]`,
          `abc12 /old sense 1/`,
          ``,
          `小二 小二 [[xiao3'er4]]`,
          `def34 /old sense 2/`,
          ``,
        ].join(`\n`),
      ),
    ).toThrow(`duplicate ids block for 小二 小二 [[xiao3'er4]] (line 4)`);
  });

  test(`throws on duplicate nanoid in one block`, () => {
    expect(() =>
      parseCedictV2IdsText(
        [
          `小二 小二 [[xiao3'er4]]`,
          `abc12 /old sense 1/`,
          `abc12 /old sense 2/`,
          ``,
        ].join(`\n`),
      ),
    ).toThrow(`duplicate nanoid in ids block: abc12 (line 3)`);
  });

  test(`throws on duplicate sense in one block`, () => {
    expect(() =>
      parseCedictV2IdsText(
        [
          `小二 小二 [[xiao3'er4]]`,
          `abc12 /old sense 1/`,
          `def34 /old sense 1/`,
          ``,
        ].join(`\n`),
      ),
    ).toThrow(`duplicate sense in ids block: old sense 1 (line 3)`);
  });

  test(`supports empty-pinyin headers`, () => {
    const parsed = parseCedictV2IdsText(
      [`龜 龜 [[]]`, `abc12 /turtle/`, ``].join(`\n`),
    );

    const [entry] = [...parsed.entriesByKey.values()];
    expect(entry).toEqual({
      traditional: `龜`,
      simplified: `龜`,
      pinyin: ``,
      rules: [{ nanoid: `abc12`, sense: `turtle` }],
    });
  });
});

describe(`buildCedictStableSenseId`, () => {
  test(`builds simplified+nanoid ids`, () => {
    expect(buildCedictStableSenseId(`想`, `fh4i3`)).toBe(`想:fh4i3`);
  });
});

describe(`parseCedictStableSenseId`, () => {
  test(`parses valid stable ids`, () => {
    expect(parseCedictStableSenseId(`想:fh4i3`)).toEqual({
      simplified: `想`,
      nanoid: `fh4i3`,
    });
  });

  test(`returns null for invalid stable ids`, () => {
    expect(parseCedictStableSenseId(`想`)).toBeNull();
    expect(parseCedictStableSenseId(`想:tooLong`)).toBeNull();
    expect(parseCedictStableSenseId(`想:12-45`)).toBeNull();
  });
});

describe(`buildCedictV2SenseIdsText`, () => {
  test(`preserves existing ids and generates ids for missing transformed senses`, () => {
    const entries = [
      parseCedictV2Line(
        `婚姻 婚姻 [[hun1yin1]] /marriage; matrimony/CL:樁|桩[zhuang1],次[ci4]/`,
      )!,
      parseCedictV2Line(
        `外面 外面 [[wai4mian4]] /outside (also pr. [wai4mian5] for this sense)/surface/exterior/`,
      )!,
    ];

    const existingIds = parseCedictV2IdsText(
      [`婚姻 婚姻 [[hun1yin1]]`, `aaaa1 /marriage; matrimony/`, ``].join(`\n`),
    );

    const generatedIds = [`b1111`, `c2222`, `d3333`];
    let idIndex = 0;

    const output = buildCedictV2SenseIdsText(entries, existingIds, {
      createNanoid: () => generatedIds[idIndex++] ?? `e4444`,
    });

    expect(output).toBe(
      [
        `婚姻 婚姻 [[hun1yin1]]`,
        `aaaa1 /marriage; matrimony/`,
        ``,
        `外面 外面 [[wai4mian4]]`,
        `b1111 /outside/`,
        `c2222 /surface/`,
        `d3333 /exterior/`,
      ].join(`\n`),
    );
  });
});

describe(`applyCedictV2EditsToText`, () => {
  test(`renders final cedict text with applied edits`, () => {
    const input = [
      `# comment`,
      `示例 示例 [[shi4li4]] /one,two/three/`,
      `小二 小二 [[xiao3'er4]] /old sense 1/old sense 2/`,
    ].join(`\n`);
    const parsed = parseCedictV2Text(input, { strict: true });

    const edits = parseCedictV2EditsText(
      [
        `示例 示例 [[shi4li4]]`,
        `/one,two/ /one/two/`,
        ``,
        `小二 小二 [[xiao3'er4]]`,
        `/old sense 1/ /new sense 1/`,
        ``,
      ].join(`\n`),
    );

    const output = applyCedictV2EditsToText(parsed, { strict: true, edits });
    expect(output).toMatchInlineSnapshot(`
      "示例 示例 [[shi4li4]] /one/two/three/
      小二 小二 [[xiao3'er4]] /new sense 1/old sense 2/"
    `);
  });

  test(`renders final cedict text with applied merge edits`, () => {
    const input = `示例 示例 [[shi4li4]] /gloss 1/gloss 2; gloss 3/gloss 4/`;
    const parsed = parseCedictV2Text(input, { strict: true });

    const edits = parseCedictV2EditsText(
      [`示例 示例 [[shi4li4]]`, `/gloss 1/ += /gloss 2; gloss 3/`, ``].join(
        `\n`,
      ),
    );

    const output = applyCedictV2EditsToText(parsed, { strict: true, edits });
    expect(output).toBe(
      `示例 示例 [[shi4li4]] /gloss 1; gloss 2; gloss 3/gloss 4/`,
    );
  });

  test(`creates a new entry from edits when source entry is missing`, () => {
    const input = `# comment`;
    const parsed = parseCedictV2Text(input, { strict: true });

    const edits = parseCedictV2EditsText(
      [`龜 龜 [[]]`, `+ /turtle/`, ``].join(`\n`),
    );

    const output = applyCedictV2EditsToText(parsed, { strict: true, edits });
    expect(output).toBe(`龜 龜 [[]] /turtle/`);
  });
});

describe(`applyCedictV2UnicodeNormalization`, () => {
  test(`normalizes traditional and simplified hanzi`, () => {
    const parsedEntries = parseCedictV2Text(`〸 〸 [[shi2]] /ten/`, {
      strict: true,
    });

    const output = applyCedictV2UnicodeNormalization(parsedEntries);

    expect(output).toEqual([
      {
        traditional: `十`,
        simplified: `十`,
        pinyin: `shi2`,
        senses: [`ten`],
      },
    ]);
  });

  test(`merges entries that share the same normalized key`, () => {
    const parsedEntries = [
      parseCedictV2Line(`〸 〸 [[shi2]] /ten old/`)!,
      parseCedictV2Line(`十 十 [[shi2]] /ten modern/ten old/`)!,
      parseCedictV2Line(`十 十 [[shi2]] /numeral ten/`)!,
    ];

    const output = applyCedictV2UnicodeNormalization(parsedEntries);

    expect(output).toEqual([
      {
        traditional: `十`,
        simplified: `十`,
        pinyin: `shi2`,
        senses: [`ten old`, `ten modern`, `numeral ten`],
      },
    ]);
  });

  test(`does not merge entries when pinyin differs`, () => {
    const parsedEntries = [
      parseCedictV2Line(`后 后 [[hou4]] /after/`)!,
      parseCedictV2Line(`後 后 [[hou2]] /name pronunciation/`)!,
    ];

    const output = applyCedictV2UnicodeNormalization(parsedEntries);

    expect(output).toEqual([
      {
        traditional: `后`,
        simplified: `后`,
        pinyin: `hou4`,
        senses: [`after`],
      },
      {
        traditional: `後`,
        simplified: `后`,
        pinyin: `hou2`,
        senses: [`name pronunciation`],
      },
    ]);
  });
});

describe(`findCedictMigratedSenseId`, () => {
  test(`returns the merged sense id when the old sense was merged`, async () => {
    const migratedSenseId = await findCedictMigratedSenseId(
      `領先 领先 [[ling3xian1]] /to lead/`,
    );

    expect(migratedSenseId).toBe(
      `領先 领先 [[ling3xian1]] /to lead; to be in front/`,
    );
  });

  test(`returns null when the old sense split into multiple senses`, async () => {
    const migratedSenseId = await findCedictMigratedSenseId(
      `嘎嘎 嘎嘎 [[ga1ga1]] /also pr. [ga1 ga5], [ga2 ga5] etc/`,
    );

    expect(migratedSenseId).toBeNull();
  });
});

describe(`buildCedictSenseId`, () => {
  test(`builds deterministic sense id bases`, () => {
    const parsed = parseCedictV2Line(`行 行 [[xing2]] /to walk;to travel/`);
    expect(parsed).not.toBeNull();

    const senseId = buildCedictSenseId(
      parsed?.traditional!,
      parsed?.simplified!,
      parsed?.pinyin!,
      parsed!.senses[0]!,
    );

    expect(senseId).toMatchInlineSnapshot(
      `"行 行 [[xing2]] /to walk;to travel/"`,
    );
  });
});

describe(`transformCedictV2Entry`, () => {
  test(`extracts standalone also-pr pronunciation senses`, () => {
    const line = `三更 三更 [[san1geng1]] /third of the five night watch periods 23:00-01:00 (old)/midnight/also pr. [san1 jin1]/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed).toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "{old} third of the five night watch periods 23:00-01:00",
          ],
          "pinyin": [
            "sāngēng",
            "sān jīn",
          ],
          "pinyinNumeric": "san1geng1",
          "senseId": "三更 三更 [[san1geng1]] /third of the five night watch periods 23:00-01:00 (old)/",
          "simplified": "三更",
          "traditional": "三更",
        },
        {
          "glosses": [
            "midnight",
          ],
          "pinyin": [
            "sāngēng",
            "sān jīn",
          ],
          "pinyinNumeric": "san1geng1",
          "senseId": "三更 三更 [[san1geng1]] /midnight/",
          "simplified": "三更",
          "traditional": "三更",
        },
      ]
    `);
  });

  test(`extracts inline also-pr pronunciation and cleans glosses`, () => {
    const line = `外面 外面 [[wai4mian4]] /outside (also pr. [wai4mian5] for this sense)/surface/exterior/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`pinyin`, `glosses`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "outside",
          ],
          "pinyin": [
            "wàimiàn",
            "wàimian",
          ],
        },
        {
          "glosses": [
            "surface",
          ],
          "pinyin": [
            "wàimiàn",
          ],
        },
        {
          "glosses": [
            "exterior",
          ],
          "pinyin": [
            "wàimiàn",
          ],
        },
      ]
    `);
  });

  test(`distributes standalone classifier senses and removes classifier-only sense`, () => {
    const line = `婚姻 婚姻 [[hun1yin1]] /marriage; matrimony/CL:樁|桩[zhuang1],次[ci4]/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`classifiers`, `glosses`])))
      .toMatchInlineSnapshot(`
      [
        {
          "classifiers": [
            "樁|桩[zhuang1]",
            "次[ci4]",
          ],
          "glosses": [
            "marriage",
            "matrimony",
          ],
        },
      ]
    `);
  });

  test(`extracts inline classifier fragments and cleans glosses`, () => {
    const line = `學問 学问 [[xue2wen4]] /learning; knowledge; scholarship/a body of specialized knowledge (CL:門|门[men2]); (fig.) any activity that demands expertise, skill or experience (e.g. gathering forensic evidence, selecting clothing, managing relationships)/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`classifiers`, `glosses`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "learning",
            "knowledge",
            "scholarship",
          ],
        },
        {
          "classifiers": [
            "門|门[men2]",
          ],
          "glosses": [
            "a body of specialized knowledge",
            "{fig.} any activity that demands expertise, skill or experience (e.g. gathering forensic evidence, selecting clothing, managing relationships)",
          ],
        },
      ]
    `);
  });

  test(`supports classifiers and also-pr extraction together`, () => {
    const line = `主意 主意 [[zhu3yi5]] /plan/idea/decision/CL:個|个[ge4]/also pr. [zhu2 yi5]/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(
      transformed.map((x) => pick(x, [`classifiers`, `glosses`, `pinyin`])),
    ).toMatchInlineSnapshot(`
      [
        {
          "classifiers": [
            "個|个[ge4]",
          ],
          "glosses": [
            "plan",
          ],
          "pinyin": [
            "zhǔyi",
            "zhú yi",
          ],
        },
        {
          "classifiers": [
            "個|个[ge4]",
          ],
          "glosses": [
            "idea",
          ],
          "pinyin": [
            "zhǔyi",
            "zhú yi",
          ],
        },
        {
          "classifiers": [
            "個|个[ge4]",
          ],
          "glosses": [
            "decision",
          ],
          "pinyin": [
            "zhǔyi",
            "zhú yi",
          ],
        },
      ]
    `);
  });
});

describe(`parseCedictV2Line label extraction`, () => {
  test.for([
    // suffix label
    [`gloss (suffix)`, `{suffix} gloss`],
    // new domains
    [`(ACG) gloss`, `{ACG} gloss`],
    [`(accounting) gloss`, `{accounting} gloss`],
    [`(acoustics) gloss`, `{acoustics} gloss`],
    [`(acrobatics) gloss`, `{acrobatics} gloss`],
    [`(aerospace) gloss`, `{aerospace} gloss`],
    [`(agriculture) gloss`, `{agriculture} gloss`],
    [`(anatomy) gloss`, `{anatomy} gloss`],
    [`(angling) gloss`, `{angling} gloss`],
    [`(animals) gloss`, `{animals} gloss`],
    [`(archaeology) gloss`, `{archaeology} gloss`],
    [`(archeology) gloss`, `{archeology} gloss`],
    [`(archery) gloss`, `{archery} gloss`],
    [`(architecture) gloss`, `{architecture} gloss`],
    [`(astronautics) gloss`, `{astronautics} gloss`],
    [`(astronomy) gloss`, `{astronomy} gloss`],
    [`(athletics) gloss`, `{athletics} gloss`],
    [`(automotive) gloss`, `{automotive} gloss`],
    [`(aviation) gloss`, `{aviation} gloss`],
    [`(ballet) gloss`, `{ballet} gloss`],
    [`(banking) gloss`, `{banking} gloss`],
    [`(baseball) gloss`, `{baseball} gloss`],
    [`(basketball) gloss`, `{basketball} gloss`],
    [`(basketwork) gloss`, `{basketwork} gloss`],
    [`(BDSM) gloss`, `{BDSM} gloss`],
    [`(beer) gloss`, `{beer} gloss`],
    [`(biochemistry) gloss`, `{biochemistry} gloss`],
    [`(biogeography) gloss`, `{biogeography} gloss`],
    [`(biology) gloss`, `{biology} gloss`],
    [`(biotechnology) gloss`, `{biotechnology} gloss`],
    [`(bird) gloss`, `{bird} gloss`],
    [`(botany) gloss`, `{botany} gloss`],
    [`(boxing) gloss`, `{boxing} gloss`],
    [`(brand) gloss`, `{brand} gloss`],
    [`(broadcasting) gloss`, `{broadcasting} gloss`],
    [`(Buddhism) gloss`, `{Buddhism} gloss`],
    [`(Buddhist) gloss`, `{Buddhist} gloss`],
    [`(business) gloss`, `{business} gloss`],
    [`(calligraphy) gloss`, `{calligraphy} gloss`],
    [`(Cant.) gloss`, `{Cantonese} gloss`],
    [`(Cantonese) gloss`, `{Cantonese} gloss`],
    [`(cartography) gloss`, `{cartography} gloss`],
    [`(Catholicism) gloss`, `{Catholicism} gloss`],
    [`(chemical) gloss`, `{chemical} gloss`],
    [`(chemistry) gloss`, `{chemistry} gloss`],
    [`(Chinese) gloss`, `{Chinese} gloss`],
    [`(Christianity) gloss`, `{Christianity} gloss`],
    [`(cinema) gloss`, `{cinema} gloss`],
    [`(cinematography) gloss`, `{cinematography} gloss`],
    [`(commerce) gloss`, `{commerce} gloss`],
    [`(communications) gloss`, `{communications} gloss`],
    [`(computer) gloss`, `{computer} gloss`],
    [`(computing) gloss`, `{computing} gloss`],
    [`(Confucianism) gloss`, `{Confucianism} gloss`],
    [`(constellation) gloss`, `{constellation} gloss`],
    [`(cookery) gloss`, `{cookery} gloss`],
    [`(cooking) gloss`, `{cooking} gloss`],
    [`(cosmetics) gloss`, `{cosmetics} gloss`],
    [`(cryptography) gloss`, `{cryptography} gloss`],
    [`(cuisine) gloss`, `{cuisine} gloss`],
    [`(currency) gloss`, `{currency} gloss`],
    [`(Daoism) gloss`, `{Daoism} gloss`],
    [`(dating) gloss`, `{dating} gloss`],
    [`(deferential) gloss`, `{deferential} gloss`],
    [`(dentistry) gloss`, `{dentistry} gloss`],
    [`(dinosaur) gloss`, `{dinosaur} gloss`],
    [`(divination) gloss`, `{divination} gloss`],
    [`(diving) gloss`, `{diving} gloss`],
    [`(ecology) gloss`, `{ecology} gloss`],
    [`(economics) gloss`, `{economics} gloss`],
    [`(education) gloss`, `{education} gloss`],
    [`(electricity) gloss`, `{electricity} gloss`],
    [`(electromagnetism) gloss`, `{electromagnetism} gloss`],
    [`(electronics) gloss`, `{electronics} gloss`],
    [`(embryology) gloss`, `{embryology} gloss`],
    [`(engineering) gloss`, `{engineering} gloss`],
    [`(entomology) gloss`, `{entomology} gloss`],
    [`(epidemiology) gloss`, `{epidemiology} gloss`],
    [`(expletive) gloss`, `{expletive} gloss`],
    [`(fandom) gloss`, `{fandom} gloss`],
    [`(fashion) gloss`, `{fashion} gloss`],
    [`(fencing) gloss`, `{fencing} gloss`],
    [`(filmmaking) gloss`, `{filmmaking} gloss`],
    [`(finance) gloss`, `{finance} gloss`],
    [`(fitness) gloss`, `{fitness} gloss`],
    [`(flying) gloss`, `{flying} gloss`],
    [`(food) gloss`, `{food} gloss`],
    [`(football) gloss`, `{football} gloss`],
    [`(forestry) gloss`, `{forestry} gloss`],
    [`(gaming) gloss`, `{gaming} gloss`],
    [`(genetic) gloss`, `{genetic} gloss`],
    [`(genetics) gloss`, `{genetics} gloss`],
    [`(geography) gloss`, `{geography} gloss`],
    [`(geology) gloss`, `{geology} gloss`],
    [`(geometry) gloss`, `{geometry} gloss`],
    [`(geopolitics) gloss`, `{geopolitics} gloss`],
    [`(geotectonics) gloss`, `{geotectonics} gloss`],
    [`(golf) gloss`, `{golf} gloss`],
    [`(government) gloss`, `{government} gloss`],
    [`(grammar) gloss`, `{grammar} gloss`],
    [`(gymnastics) gloss`, `{gymnastics} gloss`],
    [`(hairstyle) gloss`, `{hairstyle} gloss`],
    [`(historical) gloss`, `{historical} gloss`],
    [`(HK) gloss`, `{HK} gloss`],
    [`(Hong Kong) gloss`, `{HK} gloss`],
    [`(horticulture) gloss`, `{horticulture} gloss`],
    [`(humor) gloss`, `{humor} gloss`],
    [`(humorous) gloss`, `{humor} gloss`],
    [`(hydrology) gloss`, `{hydrology} gloss`],
    [`(ichthyology) gloss`, `{ichthyology} gloss`],
    [`(immunology) gloss`, `{immunology} gloss`],
    [`(information) gloss`, `{information} gloss`],
    [`(Internet slang) gloss`, `{Internet slang} gloss`],
    [`(Islam) gloss`, `{Islam} gloss`],
    [`(Japan) gloss`, `{Japan} gloss`],
    [`(journalism) gloss`, `{journalism} gloss`],
    [`(law) gloss`, `{law} gloss`],
    [`(lexicography) gloss`, `{lexicography} gloss`],
    [`(linguistics) gloss`, `{linguistics} gloss`],
    [`(logistics) gloss`, `{logistics} gloss`],
    [`(mahjong) gloss`, `{mahjong} gloss`],
    [`(Malaysia) gloss`, `{Malaysia} gloss`],
    [`(mammology) gloss`, `{mammology} gloss`],
    [`(manufacturing) gloss`, `{manufacturing} gloss`],
    [`(Maoism) gloss`, `{Maoism} gloss`],
    [`(marketing) gloss`, `{marketing} gloss`],
    [`(math) gloss`, `{math.} gloss`],
    [`(math.) gloss`, `{math.} gloss`],
    [`(mathematical) gloss`, `{math.} gloss`],
    [`(measurement) gloss`, `{measurement} gloss`],
    [`(mechanics) gloss`, `{mechanics} gloss`],
    [`(med) gloss`, `{medical} gloss`],
    [`(med.) gloss`, `{medical} gloss`],
    [`(medical) gloss`, `{medical} gloss`],
    [`(medicine) gloss`, `{medical} gloss`],
    [`(metallurgy) gloss`, `{metallurgy} gloss`],
    [`(metalwork) gloss`, `{metalwork} gloss`],
    [`(meteorology) gloss`, `{meteorology} gloss`],
    [`(microbiology) gloss`, `{microbiology} gloss`],
    [`(military) gloss`, `{military} gloss`],
    [`(mineralogy) gloss`, `{mineralogy} gloss`],
    [`(mining) gloss`, `{mining} gloss`],
    [`(Mohism) gloss`, `{Mohism} gloss`],
    [`(music) gloss`, `{music} gloss`],
    [`(mycology) gloss`, `{mycology} gloss`],
    [`(mythology) gloss`, `{mythology} gloss`],
    [`(neologism) gloss`, `{neologism} gloss`],
    [`(neuroscience) gloss`, `{neuroscience} gloss`],
    [`(obstetrics) gloss`, `{obstetrics} gloss`],
    [`(oceanography) gloss`, `{oceanography} gloss`],
    [`(opera) gloss`, `{opera} gloss`],
    [`(optics) gloss`, `{optics} gloss`],
    [`(ornithology) gloss`, `{ornithology} gloss`],
    [`(orthodontics) gloss`, `{orthodontics} gloss`],
    [`(orthography) gloss`, `{orthography} gloss`],
    [`(painting) gloss`, `{painting} gloss`],
    [`(perfumery) gloss`, `{perfumery} gloss`],
    [`(petrochemistry) gloss`, `{petrochemistry} gloss`],
    [`(pharm.) gloss`, `{pharmacology} gloss`],
    [`(pharmacology) gloss`, `{pharmacology} gloss`],
    [`(philately) gloss`, `{philately} gloss`],
    [`(philosophy) gloss`, `{philosophy} gloss`],
    [`(phonetic) gloss`, `{phonetic} gloss`],
    [`(phonetics) gloss`, `{phonetics} gloss`],
    [`(phonology) gloss`, `{phonology} gloss`],
    [`(photography) gloss`, `{photography} gloss`],
    [`(physics) gloss`, `{physics} gloss`],
    [`(physiognomy) gloss`, `{physiognomy} gloss`],
    [`(physiology) gloss`, `{physiology} gloss`],
    [`(political) gloss`, `{politics} gloss`],
    [`(politically) gloss`, `{politics} gloss`],
    [`(politics) gloss`, `{politics} gloss`],
    [`(PRC) gloss`, `{PRC} gloss`],
    [`(printing) gloss`, `{printing} gloss`],
    [`(psychological) gloss`, `{psychological} gloss`],
    [`(psychology) gloss`, `{psychology} gloss`],
    [`(publishing) gloss`, `{publishing} gloss`],
    [`(radiography) gloss`, `{radiography} gloss`],
    [`(religion) gloss`, `{religion} gloss`],
    [`(religious) gloss`, `{religion} gloss`],
    [`(retail) gloss`, `{retail} gloss`],
    [`(retailer) gloss`, `{retailer} gloss`],
    [`(retailing) gloss`, `{retailing} gloss`],
    [`(rocketry) gloss`, `{rocketry} gloss`],
    [`(science) gloss`, `{science} gloss`],
    [`(seafood) gloss`, `{seafood} gloss`],
    [`(seismology) gloss`, `{seismology} gloss`],
    [`(semantics) gloss`, `{semantics} gloss`],
    [`(Shanghainese) gloss`, `{Shanghainese} gloss`],
    [`(Shinto) gloss`, `{Shinto} gloss`],
    [`(Singapore) gloss`, `{Singapore} gloss`],
    [`(soccer) gloss`, `{soccer} gloss`],
    [`(software) gloss`, `{software} gloss`],
    [`(sports) gloss`, `{sport} gloss`],
    [`(sport) gloss`, `{sport} gloss`],
    [`(stationery) gloss`, `{stationery} gloss`],
    [`(statistics) gloss`, `{statistics} gloss`],
    [`(surname) gloss`, `{surname} gloss`],
    [`(surveying) gloss`, `{surveying} gloss`],
    [`(Taiwan) gloss`, `{Taiwan} gloss`],
    [`(Taoism) gloss`, `{Taoism} gloss`],
    [`(TCM) gloss`, `{TCM} gloss`],
    [`(technology) gloss`, `{technology} gloss`],
    [`(telecommunications) gloss`, `{telecommunications} gloss`],
    [`(telephony) gloss`, `{telephony} gloss`],
    [`(textiles) gloss`, `{textiles} gloss`],
    [`(theater) gloss`, `{theater} gloss`],
    [`(thermodynamics) gloss`, `{thermodynamics} gloss`],
    [`(time) gloss`, `{time} gloss`],
    [`(transportation) gloss`, `{transportation} gloss`],
    [`(Tw) gloss`, `{Tw} gloss`],
    [`(typesetting) gloss`, `{typesetting} gloss`],
    [`(typography) gloss`, `{typography} gloss`],
    [`(vulgar) gloss`, `{vulgar} gloss`],
    [`(watchmaking) gloss`, `{watchmaking} gloss`],
    [`(weaving) gloss`, `{weaving} gloss`],
    [`(zoology) gloss`, `{zoology} gloss`],
    // non-domain labels
    [`(abbr.) gloss`, `{abbr.} gloss`],
    [`(adj.) gloss`, `{adjective} gloss`],
    [`(adjective) gloss`, `{adjective} gloss`],
    [`(ancient) gloss`, `{ancient} gloss`],
    [`(arch.) gloss`, `{archaic} gloss`],
    [`(archaic) gloss`, `{archaic} gloss`],
    [`(article) gloss`, `{article} gloss`],
    [`(attributive) gloss`, `{attributive} gloss`],
    [`(bound form) gloss`, `{bound form} gloss`],
    [`(classical) gloss`, `{classical} gloss`],
    [`(classifier) gloss`, `{classifier} gloss`],
    [`(coll.) gloss`, `{coll.} gloss`],
    [`(colloquial) gloss`, `{coll.} gloss`],
    [`(color) gloss`, `{color} gloss`],
    [`(conjunction) gloss`, `{conjunction} gloss`],
    [`(contemporary) gloss`, `{contemporary} gloss`],
    [`(courteous) gloss`, `{courteous} gloss`],
    [`(dated) gloss`, `{dated} gloss`],
    [`(derog.) gloss`, `{derogatory} gloss`],
    [`(derogatory) gloss`, `{derogatory} gloss`],
    [`(dialect) gloss`, `{dialect} gloss`],
    [`(directional complement) gloss`, `{directional complement} gloss`],
    [`(disparaging) gloss`, `{disparaging} gloss`],
    [`(euphemism) gloss`, `{euphemism} gloss`],
    [`(fig.) gloss`, `{fig.} gloss`],
    [`(figuratively) gloss`, `{fig.} gloss`],
    [`(formal) gloss`, `{formal} gloss`],
    [`(grammatical) gloss`, `{grammatical} gloss`],
    [`(greeting) gloss`, `{greeting} gloss`],
    [`(honorific) gloss`, `{honorific} gloss`],
    [`(idiom) gloss`, `{idiom} gloss`],
    [`(imperative) gloss`, `{imperative} gloss`],
    [`(informal) gloss`, `{informal} gloss`],
    [`(insult) gloss`, `{insult} gloss`],
    [`(intensifier) gloss`, `{intensifier} gloss`],
    [`(interj) gloss`, `{interj.} gloss`],
    [`(interj.) gloss`, `{interj.} gloss`],
    [`(interjection) gloss`, `{interj.} gloss`],
    [`(intransitive) gloss`, `{intransitive} gloss`],
    [`(jocular) gloss`, `{jocular} gloss`],
    [`(jokingly) gloss`, `{jokingly} gloss`],
    [`(lit.) gloss`, `{lit.} gloss`],
    [`(literary) gloss`, `{lit.} gloss`],
    [`(loanword) gloss`, `{loanword} gloss`],
    [`(maxim) gloss`, `{maxim} gloss`],
    [`(metaphorical) gloss`, `{metaphorical} gloss`],
    [`(metonym) gloss`, `{metonym} gloss`],
    [`(modern) gloss`, `{modern} gloss`],
    [`(name) gloss`, `{name} gloss`],
    [`(noun suffix) gloss`, `{noun suffix} gloss`],
    [`(offensive) gloss`, `{offensive} gloss`],
    [`(old) gloss`, `{old} gloss`],
    [`(onom.) gloss`, `{onom.} gloss`],
    [`(orig.) gloss`, `{orig.} gloss`],
    [`(originally) gloss`, `{orig.} gloss`],
    [`(pejorative) gloss`, `{pejorative} gloss`],
    [`(polite) gloss`, `{polite} gloss`],
    [`(prefix) gloss`, `{prefix} gloss`],
    [`(pronoun) gloss`, `{pronoun} gloss`],
    [`(proverb) gloss`, `{proverb} gloss`],
    [`(punctuation) gloss`, `{punctuation} gloss`],
    [`(rare) gloss`, `{rare} gloss`],
    [`(reduplicated) gloss`, `{reduplicated} gloss`],
    [`(respectful) gloss`, `{respectful} gloss`],
    [`(rhetorical) gloss`, `{rhetorical} gloss`],
    [`(rude) gloss`, `{rude} gloss`],
    [`(saying) gloss`, `{saying} gloss`],
    [`(slang) gloss`, `{slang} gloss`],
    [`(specifier) gloss`, `{specifier} gloss`],
    [`(suffix) gloss`, `{suffix} gloss`],
    [`(technical) gloss`, `{technical} gloss`],
    [`(verb) gloss`, `{verb} gloss`],
    // "(lit. and fig.)
    // [`(lit. and fig.) gloss`, `{lit.} {fig.} gloss`],
    // extracts multiple labels
    [
      `(biology) (loanword) to clone; a clone`,
      `{biology} {loanword} to clone; a clone`,
    ],
    // Keeps labels attached to the gloss they came from
    [`gloss 1 (idiom); (fig.) gloss 2`, `{idiom} gloss 1; {fig.} gloss 2`],
    // Glosses that are solely labels are removed with no hoisting
    [`normal gloss; (idiom)`, `normal gloss`],
    // Domain labels stay on the specific gloss they annotate
    [
      `to conserve; to preserve; to keep; to store; (computing) to save (a file etc)`,
      `to conserve; to preserve; to keep; to store; {computing} to save (a file etc)`,
    ],
    // Unknown labels are left as-is
    [`(horse)`, `(horse)`],
  ] as [string, string][])(`fixture: %s → %s`, async ([input, expected]) => {
    const actual = serializeCedictV2Sense(parseCedictV2Sense(input));

    expect(actual).toBe(expected);
  });
});

describe(`applyCedictV2EditsToText sense serialization`, () => {
  test(`preserves end marker gloss text in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /example text (idiom); more text/`;
    const parsed = parseCedictV2Text(input, { strict: true });
    const output = applyCedictV2EditsToText(parsed);
    expect(output).toMatchInlineSnapshot(
      `"示例 示例 [[shi4li4]] /{idiom} example text; more text/"`,
    );
  });

  test(`preserves middle marker gloss text in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /lit. to do something (idiom); to achieve a result/`;
    const parsed = parseCedictV2Text(input, { strict: true });
    const output = applyCedictV2EditsToText(parsed);
    expect(output).toMatchInlineSnapshot(
      `"示例 示例 [[shi4li4]] /{lit.} {idiom} to do something; to achieve a result/"`,
    );
  });

  test(`preserves gloss without labels unchanged`, () => {
    const input = `示例 示例 [[shi4li4]] /plain gloss/`;
    const parsed = parseCedictV2Text(input, { strict: true });
    const output = applyCedictV2EditsToText(parsed);
    expect(output).toBe(`示例 示例 [[shi4li4]] /plain gloss/`);
  });
});

describe(`parseCedictV2Text`, () => {
  test(`includes line number in strict parse errors`, () => {
    const input = [`# comment`, `invalid line`, ``].join(`\n`);

    expect(() => parseCedictV2Text(input)).toThrow(
      `invalid CC-CEDICT v2 line (line 2)`,
    );
  });

  test(`reuses duplicate sense id prefixes`, () => {
    const input = [
      `行 行 [[xing2]] /to walk/`,
      `行 行 [[xing2]] /line of business/`,
    ].join(`\n`);

    const [first, second] = parseCedictV2Text(input);
    const firstSenseId = transformCedictV2Entry(first!)[0]?.senseId;
    const secondSenseId = transformCedictV2Entry(second!)[0]?.senseId;
    expect(firstSenseId).toContain(`行 行 [[xing2]]`);
    expect(secondSenseId).toContain(`行 行 [[xing2]]`);
  });
});

describe(`loadCedictV2`, () => {
  test(`loads and parses the bundled v2 file`, async () => {
    const items = await loadCedictV2();
    const first = items[0];

    expect(items.length).toBeGreaterThan(1000);
    expect(first).toBeDefined();
    expect(typeof first?.traditional).toBe(`string`);
    expect(typeof first?.simplified).toBe(`string`);
    expect(typeof first?.pinyin).toBe(`string`);
    expect(first?.senses.length ?? 0).toBeGreaterThan(0);
  });
});

describe(`findCedictEntryById`, () => {
  test(`round-trips sense id after resolving`, async () => {
    const [entry] = await loadCedictV2();
    expect(entry).toBeDefined();

    const originalSenseId = transformCedictV2Entry(entry!)[0]?.senseId;
    expect(originalSenseId).toBeDefined();

    const resolvedSense = await findCedictSenseById(originalSenseId!);
    expect(resolvedSense).toBeDefined();

    const resolvedEntry = await findCedictEntryById(originalSenseId!);
    expect(resolvedEntry).toBeDefined();

    const syntheticLine = `${resolvedEntry!.traditional} ${resolvedEntry!.simplified} [[${resolvedEntry!.pinyin}]] /${resolvedSense!.glosses.join(`;`)}/`;
    const reparsed = parseCedictV2Line(syntheticLine);
    expect(reparsed).not.toBeNull();

    const rebuiltSenseId = transformCedictV2Entry(reparsed!)[0]?.senseId;
    expect(rebuiltSenseId).toBe(originalSenseId);
  });

  test(`resolves entries by sense id`, async () => {
    const [entry] = await loadCedictV2();
    expect(entry).toBeDefined();
    const transformed = transformCedictV2Entry(entry!);
    expect(transformed[0]?.senseId).toBeDefined();

    const resolved = await findCedictEntryById(transformed[0]!.senseId);
    expect(resolved).toMatchObject({
      traditional: entry!.traditional,
      simplified: entry!.simplified,
      pinyin: entry!.pinyin,
    });
  });

  test(`resolves compact dictionary v2 references`, async () => {
    const resolved = await findCedictEntryById(`一 一 [[yi1]] /one/`);
    expect(resolved).toMatchInlineSnapshot(`
      {
        "pinyin": "yi1",
        "senses": [
          "one",
          "single",
          "{article} a",
          "as soon as",
          "entire; whole; all; throughout",
          ""one" radical in Chinese characters (Kangxi radical 1)",
        ],
        "simplified": "一",
        "traditional": "一",
      }
    `);
  });

  test(`returns null for unknown ids`, async () => {
    await expect(
      findCedictEntryById(`不存在 不存在 [[bu4cun2zai4]] /nope/`),
    ).resolves.toBeNull();
    await expect(
      findCedictEntryById(`does not [[exist]] /nope/`),
    ).resolves.toBeNull();
    await expect(findCedictEntryById(`行 行 [[xing2]] //`)).resolves.toBeNull();
  });
});

describe(`parseCedictSenseId`, () => {
  test(`parses valid ids`, () => {
    const id = `一 一 [[yi1]] /one/`;
    const parsed = parseCedictSenseId(id);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "yi1",
        "sense": "one",
        "simplified": "一",
        "traditional": "一",
      }
    `);
  });

  test(`parses valid id with | in the gloss`, () => {
    const id = `一 一 [[yi1]] /one ref 一|一[foo]/`;
    const parsed = parseCedictSenseId(id);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "yi1",
        "sense": "one ref 一|一[foo]",
        "simplified": "一",
        "traditional": "一",
      }
    `);
  });

  test(`parses valid id with empty pinyin`, () => {
    const id = `龜 龜 [[xx5]] /turtle/`;
    const parsed = parseCedictSenseId(id);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "xx5",
        "sense": "turtle",
        "simplified": "龜",
        "traditional": "龜",
      }
    `);
  });

  test(`returns null for invalid ids`, () => {
    expect(parseCedictSenseId(`not a valid id`)).toBeNull();
    expect(parseCedictSenseId(``)).toBeNull();
    expect(parseCedictSenseId(`一|一|yi1|one|two|three`)).toBeNull();
  });
});

describe(`findCedictSenseById`, () => {
  test(`resolves senses by sense id`, async () => {
    const [entry] = await loadCedictV2();
    expect(entry).toBeDefined();

    const transformed = transformCedictV2Entry(entry!);
    const senseId = transformed[0]?.senseId;
    expect(senseId).toBeDefined();

    const resolved = await findCedictSenseById(senseId!);
    expect(resolved).toMatchObject({
      senseId,
      glosses: transformed[0]?.glosses,
    });
  });

  test(`returns null for unknown sense ids`, async () => {
    await expect(findCedictSenseById(`does|not|exist|nope`)).resolves.toBe(
      null,
    );
    await expect(findCedictSenseById(``)).resolves.toBe(null);
  });
});

describe(`findCedictSensesForHanziWordMeaning`, () => {
  test(`ranks an exact pinyin and gloss match at the top`, async () => {
    const entries = await loadCedictV2();
    const entry = entries.find((x) => transformCedictV2Entry(x).length > 0);

    expect(entry).toBeDefined();
    if (entry == null) {
      throw new Error(`expected a CE-DICT entry`);
    }

    const [sense] = transformCedictV2Entry(entry);
    expect(sense).toBeDefined();
    if (sense == null) {
      throw new Error(`expected a transformed sense`);
    }

    const candidates = await findCedictSensesForHanziWordMeaning(
      sense.simplified as HanziText,
      [sense.pinyin[0]!],
      [sense.glosses[0]!],
    );

    expect(candidates[0]?.senseId).toBe(sense.senseId);
    expect(candidates[0]?.confidence ?? 0).toBeGreaterThan(0.8);
  });

  test(`returns empty candidates for unknown hanzi`, async () => {
    const candidates = await findCedictSensesForHanziWordMeaning(
      `🧪` as never,
      null,
      [`unknown`],
    );

    expect(candidates).toEqual([]);
  });

  test(`confidence is bounded and sorted descending`, async () => {
    const entries = await loadCedictV2();
    const entry = entries.find((x) => transformCedictV2Entry(x).length > 0);

    expect(entry).toBeDefined();
    if (entry == null) {
      throw new Error(`expected a CE-DICT entry`);
    }

    const [sense] = transformCedictV2Entry(entry);
    expect(sense).toBeDefined();
    if (sense == null) {
      throw new Error(`expected a transformed sense`);
    }

    const candidates = await findCedictSensesForHanziWordMeaning(
      sense.simplified as HanziText,
      [sense.pinyin[0]!],
      [`broad gloss`],
    );

    expect(candidates.length).toBeGreaterThan(0);

    for (const candidate of candidates) {
      expect(candidate.confidence).toBeGreaterThanOrEqual(0);
      expect(candidate.confidence).toBeLessThanOrEqual(1);
    }

    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1]!.confidence).toBeGreaterThanOrEqual(
        candidates[i]!.confidence,
      );
    }
  });

  test(`matching pinyin and gloss improve confidence`, async () => {
    const entries = await loadCedictV2();
    const entry = entries.find((x) => transformCedictV2Entry(x).length > 0);

    expect(entry).toBeDefined();
    if (entry == null) {
      throw new Error(`expected a CE-DICT entry`);
    }

    const [sense] = transformCedictV2Entry(entry);
    expect(sense).toBeDefined();
    if (sense == null) {
      throw new Error(`expected a transformed sense`);
    }

    const strong = await findCedictSensesForHanziWordMeaning(
      sense.simplified as HanziText,
      [sense.pinyin[0]!],
      [sense.glosses[0]!],
    );

    const weak = await findCedictSensesForHanziWordMeaning(
      sense.simplified as HanziText,
      [`zz` as never],
      [`definitely unrelated phrase`],
    );

    expect(strong[0]?.senseId).toBe(sense.senseId);
    expect(weak[0]).toBeDefined();
    expect((strong[0]?.confidence ?? 0) > (weak[0]?.confidence ?? 0)).toBe(
      true,
    );
  });

  test(`does case-sensitive pinyin matching`, async () => {
    const indexes = {
      entriesBySimplified: new Map([
        [
          `车上`,
          [
            {
              traditional: `車上`,
              simplified: `车上`,
              pinyin: `che1shang4` as PinyinNumericText,
              senses: [`in a car; aboard`],
            },
          ],
        ],
      ]),
    };

    const candidates = await findCedictSensesForHanziWordMeaning(
      `车上` as HanziText,
      [`CHE1SHANG4` as never],
      [`in a car`, `aboard`],
      { indexes },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.confidence).toBe(0.7);
  });
});

describe(`computeGlossesSimilarity`, () => {
  test.for([
    `to run; quick movement -> /to run; quick movement/`,
    `to run fast -> /to run slowly/quick movement/physical movement/`,
    `commemorate -> /to commemorate; to honor the memory of/memento; keepsake; souvenir/`,
    `pure; simple; unmixed; genuine -> /pure/simple/unmixed/genuine/`,
    // dictionary: 一定:certainly / CE-DICT: 一定 [[yi1ding4]]
    `certainly; definitely -> /surely; certainly; definitely/fixed; settled/a certain ...; a given .../`,
    // dictionary: 一致:unanimous / CE-DICT: 一致 [[yi1zhi4]]
    `unanimous; identical; agreement -> /consistent; unanimous; in agreement/together; in unison/`,
    // dictionary: 一般:general/common / CE-DICT: 一般 [[yi1ban1]]
    `general; common -> /common/general/in general/same/ordinary/so-so/generally/`,
    // dictionary: 一块儿:together / CE-DICT: 一塊 [[yi1kuai4]]
    `together -> /together; in the same place; in company/a piece; a chunk/(fig.) (coll.) area/(coll.) one yuan; a dollar/`,
    `appointment; make an appointment -> /to make an appointment/to weigh in a balance or on a scale/to invite/approximately/pact/treaty/to economize/to restrict/to reduce (a fraction)/concise/`,
  ] as string[])(`sorted similarity fixture: %s`, (spec) => {
    const [base, candidates] = spec.split(` -> `) as [string, string];
    const baseGlosses = base.split(`; `);
    const sorted = candidates
      .slice(1, -1)
      .split(`/`)
      .map((s) => s.split(`; `))
      .sort(
        (a, b) =>
          computeGlossesSimilarity(baseGlosses, b) -
          computeGlossesSimilarity(baseGlosses, a),
      )
      .map((s) => s.join(`; `));

    const actual = `${base} -> /${sorted.join(`/`)}/`;

    expect(actual).toBe(spec);
  });

  function splitSenses(spec: string): string[][] {
    return spec
      .slice(1, -1)
      .split(`/`)
      .map((s) => s.split(`; `));
  }

  test.for([
    [
      `appointment; make an appointment`,
      `/to make an appointment/to weigh in a balance or on a scale/to invite/approximately/pact/treaty/to economize/to restrict/to reduce (a fraction)/concise/`,
    ],
  ] as [string, string][])(`fixture %s`, ([base, candidates]) => {
    const baseGlosses = base.split(`; `);

    const actual = splitSenses(candidates)
      .map((glosses) => {
        const similarity = computeGlossesSimilarity(baseGlosses, glosses);
        return { similarity, candidate: glosses.join(`; `) };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .map((x) => `(${x.similarity}) ${x.candidate}`)
      .join(`\n`);

    expect(actual).toMatchSnapshot();
  });

  test(`appointment fixture`, () => {
    const baseGlosses = `appointment; make an appointment`.split(`; `);
    const candidates = splitSenses(
      `/to make an appointment/to weigh in a balance or on a scale/to invite/approximately/pact/treaty/to economize/to restrict/to reduce (a fraction)/concise/`,
    );

    const actual = candidates
      .map((candidate) => {
        const similarity = computeGlossesSimilarity(baseGlosses, candidate);
        return { similarity, candidate };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .map((x) => `(${x.similarity}) ${x.candidate.join(`; `)}`)
      .join(`\n`);

    expect(actual).toMatchInlineSnapshot(`
      "(0.3) to make an appointment
      (0) to weigh in a balance or on a scale
      (0) to invite
      (0) approximately
      (0) pact
      (0) treaty
      (0) to economize
      (0) to restrict
      (0) to reduce (a fraction)
      (0) concise"
    `);
  });

  test(`returns 1 for identical gloss arrays`, () => {
    const similarity = computeGlossesSimilarity(
      [`to run`, `quick movement`],
      [`to run`, `quick movement`],
    );

    expect(similarity).toBe(1);
  });

  test(`returns 1 when gloss arrays match after normalization`, () => {
    const similarity = computeGlossesSimilarity(
      [`  To Run `, `quick   movement`],
      [`to run`, `quick movement`],
    );

    expect(similarity).toBe(1);
  });

  test(`returns 0 for completely different glosses`, () => {
    const similarity = computeGlossesSimilarity(
      [`to run`, `quick movement`],
      [`blue sky`, `ocean`],
    );

    expect(similarity).toBe(0);
  });

  test(`returns partial score for partially overlapping glosses`, () => {
    const similarity = computeGlossesSimilarity(
      [`to run fast`, `quick movement`],
      [`to run slowly`, `physical movement`],
    );

    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  test(`treats two empty arrays as exactly the same`, () => {
    const similarity = computeGlossesSimilarity([], []);
    expect(similarity).toBe(1);
  });

  test(`returns 0 when only one side is empty`, () => {
    const similarity = computeGlossesSimilarity([`test`], []);
    expect(similarity).toBe(0);
  });
});

test(`generate eval dataset`, async () => {
  const cedict = await loadCedictV2();

  for (const x of cedict) {
    if (x.simplified === `恶棍`) {
      // oxlint-disable-next-line no-console
      // console.log({
      //   traditional: x.traditional,
      //   simplified: x.simplified,
      //   pinyin: normalizePinyinText(x.pinyin),
      //   definition: x.senses.map((y) => y.split(`; `)),
      // });
    }
  }
});

describe(`nestedStringSetScorer`, () => {
  test(`different gloss order`, () => {
    const result = nestedStringSetScorer({
      actual: [[`to go (in a direction)`, `go`, `depart`]],
      expected: [[`depart`, `to go (in a direction)`, `go`]],
    });
    expect(result).toEqual({ score: 1, mismatches: new Set() });
  });

  test(`multiple senses`, () => {
    const result = nestedStringSetScorer({
      actual: [[`to go (in a direction)`, `go`, `depart`], [`b`]],
      expected: [
        [`depart`, `to go (in a direction)`, `go`],
        [`b`, `b`],
      ],
    });
    expect(result).toEqual({ score: 1, mismatches: new Set() });
  });

  test(`different sense ordering`, () => {
    const result = nestedStringSetScorer({
      actual: [[`to go (in a direction)`, `go`, `depart`], [`b`]],
      expected: [
        [`b`, `b`],
        [`depart`, `to go (in a direction)`, `go`],
      ],
    });
    expect(result).toEqual({ score: 1, mismatches: new Set() });
  });

  test(`mixed up glosses`, () => {
    const result = nestedStringSetScorer({
      actual: [[`to go (in a direction)`], [`a`, `b`, `go`, `depart`]],
      expected: [
        [`a`, `b`],
        [`depart`, `to go (in a direction)`, `go`],
      ],
    });
    expect(result.score).toBeLessThan(1);
    expect(result.mismatches).toMatchObject(
      new Set([
        {
          actual: new Set([`to go (in a direction)`]),
          expected: new Set([`depart`, `to go (in a direction)`, `go`]),
        },
        {
          actual: new Set([`a`, `b`, `go`, `depart`]),
          expected: new Set([`a`, `b`]),
        },
      ]),
    );
  });

  test(`extra returned glosses`, () => {
    const result = nestedStringSetScorer({
      actual: [[`a`, `b`, `c`]],
      expected: [[`a`, `b`]],
    });
    expect(result.score).toBeLessThan(1);
    expect(result.mismatches).toMatchObject(
      new Set([
        {
          actual: new Set([`a`, `b`, `c`]),
          expected: new Set([`a`, `b`]),
        },
      ]),
    );
  });

  test(`fallback matching detection`, () => {
    const result = nestedStringSetScorer({
      actual: [[`a`], [`x`], [`c`]],
      expected: [[`y`], [`a`], [`c`]],
    });
    expect(result.score).toBeLessThan(1);
    expect(result.mismatches).toMatchObject(
      new Set([
        {
          actual: new Set([`x`]),
          expected: new Set(),
        },
        {
          actual: new Set(),
          expected: new Set([`y`]),
        },
      ]),
    );
  });
});
