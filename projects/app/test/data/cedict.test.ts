// pyly-not-src-test
import { describe, expect, test, vi } from "vitest";
import type { CedictV2EntryType, ParsedCedictV2GlossType } from "./cedict";
import {
  buildCedictSenseSampling,
  applyCedictV2EditsToText,
  applyCedictV2UnicodeNormalization,
  buildCedictV2EntryId,
  buildCedictV2GroupedSensesFromSampling,
  buildCedictV2SenseIdsText,
  buildSenseGlossOrderMatrix,
  buildSenseGroupingAffinityMatrix,
  cedictIdsPath,
  cedictPath,
  cedictSenseSamplingPath,
  clusterGlossesFromAffinityMatrix,
  createGlossOrderSortComparator,
  clusterCedictSenseSamplingEntry,
  computeGlossesSimilarity,
  decodeCedictSenseSamplingRow,
  encodeCedictSenseSamplingRow,
  extractDictionaryPinyinFromCedictSense,
  findCedictSenseById,
  isLikelyOverSplitCedictEntry,
  loadCedictSenseSampling,
  loadCedictV2,
  loadCedictV2Ids,
  migrateSense,
  nestedStringSetScorer,
  parseCedictEntryRefs,
  parseCedictSenseSamplingText,
  parseCedictV2EditsText,
  parseCedictV2Gloss,
  parseCedictV2IdsText,
  parseCedictV2Line,
  parseCedictV2Sense,
  parseCedictV2Text,
  serializeCedictSenseSamplingText,
  serializeCedictV2Entries,
  serializeCedictV2Sense,
  buildSenseGroupingEntryFromCedictEntry,
  groupCedictEntriesByHskLevel,
  splitCedictV2Sense,
} from "./cedict";
import {
  fmtJsonFile,
  writeJsonFileIfChanged,
  writeUtf8FileIfChanged,
} from "@pinyinly/lib/fs";
import { isCi } from "#util/env.js";
import {
  mergeSortComparators,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { PinyinNumericText } from "#data/model.js";
import * as aiModule from "#server/lib/ai.js";
import * as cedictModule from "./cedict";

describe(`isLikelyOverSplitCedictEntry`, () => {
  test.for([
    // true likely over-split gloss-only senses
    `✅ 長 长 [[zhang3]] /chief/head/elder/to grow/to develop/to increase/to enhance/`,
    `✅ 示例 示例 [[shi4li4]] /chief/head/to grow/very long descriptive phrase here/`,
    `✅ 惡心 恶心 [[e3xin1]] /nausea/disgust/`,
    `✅ 惡心 恶心 [[e3xin1]] /fig. nausea/disgust/`,
    // returns false when any sense already groups glosses with semicolons
    `❌ 婚姻 婚姻 [[hun1yin1]] /marriage; matrimony/union/relationship/status/`,
  ])(`%s`, (spec) => {
    const prefix = spec.slice(0, 2);
    expect(prefix).toBeOneOf([`✅ `, `❌ `]);

    const line = spec.slice(2).trim();
    const expected = prefix === `✅ `;

    const parsed = parseCedictV2Line(line, { strict: true });

    expect(isLikelyOverSplitCedictEntry(parsed!)).toBe(expected);
  });
});

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

describe(`parseCedictEntryRefs`, () => {
  test(`parses comma-separated refs with traditional+simplified+pinyin and simplified+pinyin forms and pinyin forms`, () => {
    expect(parseCedictEntryRefs(`個|个[ge4],位[wei4],[wei4]`)).toEqual({
      refs: [`個|个[ge4]`, `位[wei4]`, `[wei4]`],
      tail: ``,
    });
  });

  test(`returns prefix refs and preserves the unparsed tail`, () => {
    expect(
      parseCedictEntryRefs(`小偷[xiao3tou1], invalid, 朋友[peng2you3]`),
    ).toEqual({
      refs: [`小偷[xiao3tou1]`],
      tail: `, invalid, 朋友[peng2you3]`,
    });
  });

  test(`parses no-pinyin refs`, () => {
    expect(parseCedictEntryRefs(`許|许`)).toEqual({
      refs: [`許|许`],
      tail: ``,
    });
  });

  test(`preserves tail when continuation is invalid`, () => {
    expect(parseCedictEntryRefs(`許|许, invalid tail`)).toEqual({
      refs: [`許|许`],
      tail: `, invalid tail`,
    });
  });

  test(`parses 'and' separated`, () => {
    expect(parseCedictEntryRefs(`懈[xie4] and 邂[xie4]`)).toEqual({
      refs: [`懈[xie4]`, `邂[xie4]`],
      tail: ``,
    });
  });

  test(`parses 'or' separated`, () => {
    expect(parseCedictEntryRefs(`懈[xie4] or 邂[xie4]`)).toEqual({
      refs: [`懈[xie4]`, `邂[xie4]`],
      tail: ``,
    });
  });

  test(`parses space separated`, () => {
    expect(parseCedictEntryRefs(`[yao1] [xiao3tou1]`)).toEqual({
      refs: [`[yao1]`, `[xiao3tou1]`],
      tail: ``,
    });
  });

  test(`parses space separated with tail`, () => {
    expect(parseCedictEntryRefs(`[yao1] foo`)).toEqual({
      refs: [`[yao1]`],
      tail: ` foo`,
    });
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
    expect(
      parsed.entriesByKey.get(
        buildCedictV2EntryId({
          traditional: `〸`,
          simplified: `〸`,
          pinyin: `shi2` as PinyinNumericText,
        }),
      )?.rules[0],
    ).toMatchInlineSnapshot(`
      {
        "kind": "replace",
        "newSense": "Suzhou numeral ten",
        "oldSense": "numeral 10 in the Suzhou numeral system 蘇州碼子|苏州码子[Su1zhou1 ma3zi5]",
      }
    `);
    expect(
      parsed.entriesByKey.get(
        buildCedictV2EntryId({
          traditional: `十`,
          simplified: `十`,
          pinyin: `shi2` as PinyinNumericText,
        }),
      )?.rules[0],
    ).toEqual({
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

    expect(parsed.entriesById.size).toBe(0);
    expect([...parsed.entriesById.values()]).toEqual([]);
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

    expect(parsed.entriesById.size).toBe(1);
    const [entry] = [...parsed.entriesById.values()];
    expect(entry).toEqual({
      traditional: `小二`,
      simplified: `小二`,
      pinyin: `xiao3'er4`,
      rules: [
        { id: `abc12`, sense: `new sense 1`, mergedIds: [] },
        { id: `def34`, sense: `old sense 2`, mergedIds: [] },
      ],
    });
  });

  test(`parses merged nanoid breadcrumbs`, () => {
    const parsed = parseCedictV2IdsText(
      [
        `雞菇 鸡菇 [[ji1gu1]]`,
        `jtPMw←QfLQh,CP2Qp /(see 雞腿菇|鸡腿菇[ji1tui3gu1])/`,
        ``,
      ].join(`\n`),
    );

    const [entry] = [...parsed.entriesById.values()];
    expect(entry).toEqual({
      traditional: `雞菇`,
      simplified: `鸡菇`,
      pinyin: `ji1gu1`,
      rules: [
        {
          id: `jtPMw`,
          sense: `(see 雞腿菇|鸡腿菇[ji1tui3gu1])`,
          mergedIds: [`QfLQh`, `CP2Qp`],
        },
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

    const [entry] = [...parsed.entriesById.values()];
    expect(entry).toEqual({
      traditional: `車上`,
      simplified: `车上`,
      pinyin: `che1 shang4`,
      rules: [{ id: `a1B2c`, sense: `in a car; aboard`, mergedIds: [] }],
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

  test(`throws on duplicate merged nanoids in one rule`, () => {
    expect(() =>
      parseCedictV2IdsText(
        [`小二 小二 [[xiao3'er4]]`, `abc12←def34,def34 /old sense/`, ``].join(
          `\n`,
        ),
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
    ).toThrow(`duplicate ID in ids block: abc12 (line 3)`);
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

    const [entry] = [...parsed.entriesById.values()];
    expect(entry).toEqual({
      traditional: `龜`,
      simplified: `龜`,
      pinyin: ``,
      rules: [{ id: `abc12`, sense: `turtle`, mergedIds: [] }],
    });
  });
});

describe(`buildCedictV2SenseIdsText`, () => {
  test(`preserves existing merged ids for unchanged senses`, () => {
    const entries = [
      parseCedictV2Line(
        `雞菇 鸡菇 [[ji1gu1]] /(see 雞腿菇|鸡腿菇[ji1tui3gu1])/`,
      )!,
    ];

    const existingIds = parseCedictV2IdsText(
      [
        `雞菇 鸡菇 [[ji1gu1]]`,
        `jtPMw←QfLQh,CP2Qp /(see 雞腿菇|鸡腿菇[ji1tui3gu1])/`,
        ``,
      ].join(`\n`),
    );

    const result = buildCedictV2SenseIdsText(entries, existingIds, {
      createId: () => `zzzzz`,
    });

    expect(result.text).toBe(
      [
        `雞菇 鸡菇 [[ji1gu1]]`,
        `jtPMw←QfLQh,CP2Qp /(see 雞腿菇|鸡腿菇[ji1tui3gu1])/`,
        ``,
      ].join(`\n`),
    );
    expect(result.stats).toEqual({
      newIds: [],
      mergedIds: [],
      deletedIds: [],
    });
  });

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

    const result = buildCedictV2SenseIdsText(entries, existingIds, {
      createId: () => generatedIds[idIndex++] ?? `e4444`,
    });

    expect(result.text).toBe(
      [
        `婚姻 婚姻 [[hun1yin1]]`,
        `aaaa1 /marriage; matrimony/`,
        `b1111 /(uses classifier 樁|桩[zhuang1],次[ci4])/`,
        ``,
        `外面 外面 [[wai4mian4]]`,
        `c2222 /outside (also pr. [wai4mian5] for this sense)/`,
        `d3333 /surface/`,
        `e4444 /exterior/`,
        ``,
      ].join(`\n`),
    );
    expect(result.stats).toEqual({
      newIds: [`b1111`, `c2222`, `d3333`, `e4444`],
      mergedIds: [],
      deletedIds: [],
    });
  });

  test(`migrates legacy raw sense ids to transformed serialized senses`, () => {
    const entries = [
      parseCedictV2Line(
        `三更 三更 [[san1geng1]] /third of the five night watch periods 23:00-01:00 (old)/midnight/also pr. [san1 jin1]/`,
      )!,
    ];

    const existingIds = parseCedictV2IdsText(
      [
        `三更 三更 [[san1geng1]]`,
        `aaaa1 /third of the five night watch periods 23:00-01:00 (old)/`,
        `bbbb2 /midnight/`,
        ``,
      ].join(`\n`),
    );

    const result = buildCedictV2SenseIdsText(entries, existingIds, {
      createId: () => `ccccc`,
    });

    expect(result.text).toBe(
      [
        `三更 三更 [[san1geng1]]`,
        `aaaa1 /third of the five night watch periods 23:00-01:00 (old)/`,
        `bbbb2 /midnight/`,
        `ccccc /(also pr. [san1 jin1])/`,
        ``,
      ].join(`\n`),
    );
    expect(result.stats).toEqual({
      newIds: [`ccccc`],
      mergedIds: [],
      deletedIds: [],
    });
  });

  test(`migrates legacy raw old variant-of ids to wrapped serialized senses`, () => {
    const entries = [
      parseCedictV2Line(`五 五 [[wu3]] /(old) (variant of 五[wu3])/`)!,
    ];

    const existingIds = parseCedictV2IdsText(
      [`五 五 [[wu3]]`, `aaaa1 /old variant of 五[wu3]/`, ``].join(`\n`),
    );

    const result = buildCedictV2SenseIdsText(entries, existingIds, {
      createId: () => `bbbbb`,
    });

    expect(result.text).toBe(
      [`五 五 [[wu3]]`, `aaaa1 /(old) (variant of 五[wu3])/`, ``].join(`\n`),
    );
    expect(result.stats).toEqual({
      newIds: [],
      mergedIds: [],
      deletedIds: [],
    });
  });

  test(`includes migrated ID when senses are migrated`, () => {
    const entries = [parseCedictV2Line(`五 五 [[wu3]] /one; two/`)!];

    const existingIds = parseCedictV2IdsText(
      [`五 五 [[wu3]]`, `aaaaa /one/`, `bbbbb /two/`].join(`\n`),
    );

    const result = buildCedictV2SenseIdsText(entries, existingIds, {
      createId: () => `ccccc`,
    });

    expect(result.text).toBe(
      [`五 五 [[wu3]]`, `aaaaa←bbbbb /one; two/`, ``].join(`\n`),
    );
    expect(result.stats).toEqual({
      newIds: [],
      mergedIds: [`bbbbb`],
      deletedIds: [],
    });
  });

  test(`writes ids rules sorted by nanoid for stable output`, () => {
    const entries = [
      parseCedictV2Line(`外面 外面 [[wai4mian4]] /outside/surface/exterior/`)!,
    ];

    const existingIds = parseCedictV2IdsText(
      [
        `外面 外面 [[wai4mian4]]`,
        `z9999 /outside/`,
        `a1111 /surface/`,
        `m5555 /exterior/`,
        ``,
      ].join(`\n`),
    );

    const result = buildCedictV2SenseIdsText(entries, existingIds, {
      createId: () => `q0000`,
    });

    expect(result.text).toBe(
      [
        `外面 外面 [[wai4mian4]]`,
        `a1111 /surface/`,
        `m5555 /exterior/`,
        `z9999 /outside/`,
        ``,
      ].join(`\n`),
    );
    expect(result.stats).toEqual({
      newIds: [],
      mergedIds: [],
      deletedIds: [],
    });
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

    const output = serializeCedictV2Entries(
      applyCedictV2EditsToText(parsed, { strict: true, edits }),
    );
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

    const output = serializeCedictV2Entries(
      applyCedictV2EditsToText(parsed, { strict: true, edits }),
    );
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

    const output = serializeCedictV2Entries(
      applyCedictV2EditsToText(parsed, { strict: true, edits }),
    );
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

describe(`migrateSense`, () => {
  test(`maps old senses to new senses when the old sense was merged`, async () => {
    const mappedSense = migrateSense(`to lead; to be in front`, [
      `to lead`,
      `to be in front`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`prefers exact matches over partial matches`, () => {
    const mappedSense = migrateSense(`to lead`, [
      `to lead; to be in front`,
      `to lead`,
    ]);

    expect(mappedSense).toEqual(1);
  });

  test(`returns -1 when no candidate is valid`, () => {
    const mappedSense = migrateSense(`to lead`, [`quack`, `to be in front`]);

    expect(mappedSense).toEqual(-1);
  });

  test(`breaks ties by choosing the first index`, () => {
    const mappedSense = migrateSense(`to lead`, [`to lead`, `to lead`]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped and unwrapped standalone pronunciation senses`, () => {
    const mappedSense = migrateSense(`also pr. [pou1]`, [`(also pr. [pou1])`]);

    expect(mappedSense).toEqual(0);
  });

  test(`unwraps nested outer parentheses during migration comparison`, () => {
    const mappedSense = migrateSense(`outside`, [`((outside))`]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped label-only glosses`, () => {
    const mappedSense = migrateSense(`old`, [`(old)`]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped classifier-for glosses against legacy bare classifier-for senses`, () => {
    const mappedSense = migrateSense(`(classifier for noises)`, [
      `classifier for noises`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches bare classifier-for glosses against wrapped classifier-for senses`, () => {
    const mappedSense = migrateSense(`classifier for noises`, [
      `(classifier for noises)`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches bare classifier-for glosses with parenthesis content`, () => {
    const mappedSense = migrateSense(
      `(classifier for terms served in office, or for spouses, girlfriends etc (as in 前任男友))`,
      [
        `classifier for terms served in office, or for spouses, girlfriends etc (as in 前任男友)`,
      ],
    );

    expect(mappedSense).toEqual(0);
  });

  test(`matches legacy CL glosses against uses-classifier glosses`, () => {
    const mappedSense = migrateSense(
      `(uses classifier 樁|桩[zhuang1],次[ci4])`,
      [`(CL:樁|桩[zhuang1],次[ci4])`],
    );

    expect(mappedSense).toEqual(0);
  });

  test(`matches uses-classifier glosses against legacy CL glosses`, () => {
    const mappedSense = migrateSense(`(CL:門|门[men2])`, [
      `(uses classifier 門|门[men2])`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped old variant-of glosses against legacy raw senses`, () => {
    const mappedSense = migrateSense(`(old) (variant of 五[wu3])`, [
      `old variant of 五[wu3]`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped old variant-of glosses with trailing labels against legacy raw senses`, () => {
    const mappedSense = migrateSense(`(old) (variant of 五[wu3]) (lit.)`, [
      `old variant of 五[wu3] (lit.)`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped old variant-of in text glosses against legacy inline old-variant`, () => {
    const mappedSense = migrateSense(`to obtain (old) (variant of 得[de2])`, [
      `to obtain (old variant of 得[de2])`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches wrapped old variant-of in text glosses against legacy inline old-variant`, () => {
    const mappedSense = migrateSense(
      `used in expressions of the form 照[zhao4] + {verb} + 不誤|不误[bu4wu4], in which 照[zhao4] means "as before", and the overall meaning is "carry on (doing sth) regardless" or "continue (to do sth) in spite of changed circumstances", e.g. 照買不誤|照买不误[zhao4 mai3 bu4wu4], to keep on buying (a product) regardless (of price hikes)`,
      [
        `used in expressions of the form 照[zhao4] + {verb} + 不誤|不误[bu4wu4], in which 照[zhao4] means "as before", and the overall meaning is "carry on (doing sth) regardless" or "continue (to do sth) in spite of changed circumstances", e.g. 照買不誤|照买不误[zhao4 mai3 bu4wu4], to keep on buying (a product) regardless (of price hikes)`,
      ],
    );

    expect(mappedSense).toEqual(0);
  });

  test(`matches parenthesized abbreviation against unwrapped abbreviation`, () => {
    const mappedSense = migrateSense(`foo. for Lebanon 黎巴嫩[Li2ba1nen4]`, [
      `(foo.) for Lebanon 黎巴嫩[Li2ba1nen4]`,
    ]);

    expect(mappedSense).toEqual(0);
  });

  test(`matches by sense content only`, () => {
    const mappedSense = migrateSense(`to lead`, [
      `to lead`,
      `to lead; to be in front`,
    ]);

    expect(mappedSense).toEqual(0);
  });
});

describe(`serializeCedictV2Sense`, () => {
  test(`round-trips a text-only sense`, () => {
    const parsed = parseCedictV2Sense(`to walk`);
    expect(serializeCedictV2Sense(parsed)).toBe(`to walk`);
  });

  test(`round-trips multiple glosses`, () => {
    const parsed = parseCedictV2Sense(`marriage; matrimony`);
    expect(serializeCedictV2Sense(parsed)).toBe(`marriage; matrimony`);
  });

  test(`round-trips label at start`, () => {
    const parsed = parseCedictV2Sense(`(fig.) something figurative`);
    expect(serializeCedictV2Sense(parsed)).toBe(`(fig.) something figurative`);
  });

  test(`round-trips label at end`, () => {
    const parsed = parseCedictV2Sense(`some gloss (old)`);
    expect(serializeCedictV2Sense(parsed)).toBe(`some gloss (old)`);
  });

  test(`round-trips inline classifier`, () => {
    const parsed = parseCedictV2Sense(
      `a body of specialized knowledge (CL:門|门[men2])`,
    );
    expect(serializeCedictV2Sense(parsed)).toBe(
      `a body of specialized knowledge (uses classifier 門|门[men2])`,
    );
  });

  test(`groups multiple consecutive classifier items into one uses-classifier fragment`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `text`, text: `some noun` },
          { kind: `usesClassifier`, value: `樁|桩[zhuang1]` },
          { kind: `usesClassifier`, value: `次[ci4]` },
        ],
      },
    ];
    expect(serializeCedictV2Sense(glosses)).toBe(
      `some noun (uses classifier 樁|桩[zhuang1],次[ci4])`,
    );
  });

  test(`serializes alsoPr items`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `text`, text: `outside` },
          { kind: `alsoPr`, value: `wai4mian5` },
        ],
      },
    ];
    expect(serializeCedictV2Sense(glosses)).toBe(
      `outside (also pr. [wai4mian5])`,
    );
  });

  test(`serializes abbrFor items`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          {
            kind: `abbrFor`,
            value: `毛澤東思想概論|毛泽东思想概论[Mao2 Ze2dong1 Si1xiang3 Gai4lun4]`,
          },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(abbr. for 毛澤東思想概論|毛泽东思想概论[Mao2 Ze2dong1 Si1xiang3 Gai4lun4])`,
    );
  });

  test(`serializes abbrFor free-text payloads`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          {
            kind: `abbrFor`,
            value: `Hubei 湖北省[Hu2bei3 Sheng3] and Hunan 湖南省[Hu2nan2 Sheng3] provinces together`,
          },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(abbr. for Hubei 湖北省[Hu2bei3 Sheng3] and Hunan 湖南省[Hu2nan2 Sheng3] provinces together)`,
    );
  });

  test(`serializes abbrTo items`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `abbrTo`, value: `世博[Shi4bo2]` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(`(abbr. to 世博[Shi4bo2])`);
  });

  test(`groups multiple consecutive alsoPr items`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `alsoPr`, value: `san1geng1` },
          { kind: `alsoPr`, value: `san1 jin1` },
        ],
      },
    ];
    expect(serializeCedictV2Sense(glosses)).toBe(
      `(also pr. [san1geng1] [san1 jin1])`,
    );
  });

  test(`serializes marker-specific pronunciation tokens`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `alsoPr`, value: `hui3`, marker: `taiwan` }],
      },
    ];
    expect(serializeCedictV2Sense(glosses)).toBe(`(Taiwan pr. [hui3])`);
  });

  test(`serializes generic pronunciation marker`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `alsoPr`, value: `biang4`, marker: `generic` }],
      },
    ];
    expect(serializeCedictV2Sense(glosses)).toBe(`(pr. [biang4])`);
  });

  test(`does not group consecutive alsoPr items with different markers`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `alsoPr`, value: `an1`, marker: `colloquial` },
          { kind: `alsoPr`, value: `an1`, marker: `taiwan` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(colloquial pr. [an1]) (Taiwan pr. [an1])`,
    );
  });

  test(`serializes standalone variant-of`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `variantOf`, value: `餵|喂[wei4]` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(`(variant of 餵|喂[wei4])`);
  });

  test(`serializes old label + variant-of as old variant-of`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `label`, value: `old` },
          { kind: `variantOf`, value: `五[wu3]` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(`(old) (variant of 五[wu3])`);
  });

  test(`serializes standalone see`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `see`, value: `筊杯[jiao3bei1]` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(`(see 筊杯[jiao3bei1])`);
  });

  test(`groups multiple consecutive see items`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `see`, value: `筊杯[jiao3bei1]` },
          { kind: `see`, value: `獬豸[xie4zhi4]` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(see 筊杯[jiao3bei1],獬豸[xie4zhi4])`,
    );
  });

  test(`serializes inline see in parentheses`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `text`, text: `mythical animal` },
          { kind: `see`, value: `獬豸[xie4zhi4]` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `mythical animal (see 獬豸[xie4zhi4])`,
    );
  });

  test(`serializes standalone see also`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `seeAlso`, value: `槲樹|槲树[hu2shu4]` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(see also 槲樹|槲树[hu2shu4])`,
    );
  });

  test(`serializes inline see also in parentheses`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `text`, text: `the most handsome boy in the school` },
          { kind: `seeAlso`, value: `校花[xiao4hua1]` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `the most handsome boy in the school (see also 校花[xiao4hua1])`,
    );
  });

  test(`serializes standalone also written`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `alsoWritten`, value: `三疊紀|三叠纪` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(also written 三疊紀|三叠纪)`,
    );
  });

  test(`serializes standalone used in`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `usedIn`, value: `刺棱[ci1leng1]` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(`(used in 刺棱[ci1leng1])`);
  });

  test(`serializes inline used in in parentheses`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `text`, text: `word` },
          { kind: `usedIn`, value: `刺棱[ci1leng1]` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `word (used in 刺棱[ci1leng1])`,
    );
  });

  test(`does not special-case free-text used in as a token`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [{ kind: `text`, text: `orange peel (used in TCM)` }],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(`orange peel (used in TCM)`);
  });

  test(`does not special-case "used in" text tokens`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          {
            kind: `text`,
            text: `used in 浚縣|浚县[Xun4 Xian4] (the name of a place in Henan)`,
          },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `used in 浚縣|浚县[Xun4 Xian4] (the name of a place in Henan)`,
    );
  });

  test(`serializes classifierFor item`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          {
            kind: `classifierFor`,
            value: `objects with flat surfaces such as drums, mirrors, flags etc`,
          },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `(classifier for objects with flat surfaces such as drums, mirrors, flags etc)`,
    );
  });

  test(`round-trips classifier-for standalone sense using canonical wrapping`, () => {
    const parsed = parseCedictV2Sense(`classifier for noises`);
    expect(serializeCedictV2Sense(parsed)).toBe(`(classifier for noises)`);
  });

  test(`serializes label plus classifier-for`, () => {
    const parsed = parseCedictV2Sense(
      `(lit.) classifier for a full circuit or a turn of a coil`,
    );
    expect(serializeCedictV2Sense(parsed)).toBe(
      `(lit.) (classifier for a full circuit or a turn of a coil)`,
    );
  });

  test(`serializes inline classifier-for in parentheses`, () => {
    const glosses: ParsedCedictV2GlossType[] = [
      {
        tokens: [
          { kind: `text`, text: `word` },
          { kind: `classifierFor`, value: `clothes, mats, screens etc` },
        ],
      },
    ];

    expect(serializeCedictV2Sense(glosses)).toBe(
      `word (classifier for clothes, mats, screens etc)`,
    );
  });
});

describe(`parseCedictV2Gloss`, () => {
  test(`label at start`, () => {
    expect(parseCedictV2Gloss(`(fig.) something figurative`)).toEqual([
      { kind: `label`, value: `fig.` },
      { kind: `text`, text: `something figurative` },
    ]);
  });

  test(`label alias is normalized`, () => {
    expect(parseCedictV2Gloss(`(figuratively) something`)).toEqual([
      { kind: `label`, value: `fig.` },
      { kind: `text`, text: `something` },
    ]);
  });

  test(`label at end`, () => {
    expect(parseCedictV2Gloss(`some gloss (old)`)).toEqual([
      { kind: `text`, text: `some gloss` },
      { kind: `label`, value: `old` },
    ]);
  });

  test(`inline classifier produces text then classifier items`, () => {
    expect(
      parseCedictV2Gloss(`a body of specialized knowledge (CL:門|门[men2])`),
    ).toEqual([
      { kind: `text`, text: `a body of specialized knowledge` },
      { kind: `usesClassifier`, value: `門|门[men2]` },
    ]);
  });

  test(`inline uses-classifier produces text then classifier items`, () => {
    expect(
      parseCedictV2Gloss(
        `a body of specialized knowledge (uses classifier 門|门[men2])`,
      ),
    ).toEqual([
      { kind: `text`, text: `a body of specialized knowledge` },
      { kind: `usesClassifier`, value: `門|门[men2]` },
    ]);
  });

  test(`multiple refs in one CL produce one classifier item each`, () => {
    expect(parseCedictV2Gloss(`some noun (CL:樁|桩[zhuang1],次[ci4])`)).toEqual(
      [
        { kind: `text`, text: `some noun` },
        { kind: `usesClassifier`, value: `樁|桩[zhuang1]` },
        { kind: `usesClassifier`, value: `次[ci4]` },
      ],
    );
  });

  test(`repeated leading parenthesized CL segments are consumed one-by-one`, () => {
    expect(parseCedictV2Gloss(`(CL:門|门[men2]) (CL:樁|桩[zhuang1])`)).toEqual([
      { kind: `usesClassifier`, value: `門|门[men2]` },
      { kind: `usesClassifier`, value: `樁|桩[zhuang1]` },
    ]);
  });

  test(`multiple inline CL segments are consumed one-by-one`, () => {
    expect(
      parseCedictV2Gloss(`foo (CL:門|门[men2]) bar (CL:樁|桩[zhuang1]) baz`),
    ).toEqual([
      { kind: `text`, text: `foo` },
      { kind: `usesClassifier`, value: `門|门[men2]` },
      { kind: `text`, text: `bar` },
      { kind: `usesClassifier`, value: `樁|桩[zhuang1]` },
      { kind: `text`, text: `baz` },
    ]);
  });

  test(`standalone CL gloss produces only classifier items`, () => {
    expect(parseCedictV2Gloss(`CL:樁|桩[zhuang1],次[ci4]`)).toEqual([
      { kind: `usesClassifier`, value: `樁|桩[zhuang1]` },
      { kind: `usesClassifier`, value: `次[ci4]` },
    ]);
  });

  test(`standalone classifier-for gloss produces classifierFor item`, () => {
    expect(
      parseCedictV2Gloss(
        `classifier for objects with flat surfaces such as drums, mirrors, flags etc`,
      ),
    ).toEqual([
      {
        kind: `classifierFor`,
        value: `objects with flat surfaces such as drums, mirrors, flags etc`,
      },
    ]);
  });

  test(`parses classifier-for with inline parenthetical detail`, () => {
    expect(
      parseCedictV2Gloss(
        `classifier for binary bits (e.g. 十六位 16-bit or 2 bytes)`,
      ),
    ).toEqual([
      {
        kind: `classifierFor`,
        value: `binary bits (e.g. 十六位 16-bit or 2 bytes)`,
      },
    ]);
  });

  test(`parses classifier-for with as-in parenthetical detail`, () => {
    expect(
      parseCedictV2Gloss(
        `classifier for terms served in office, or for spouses, girlfriends etc (as in 前任男友)`,
      ),
    ).toEqual([
      {
        kind: `classifierFor`,
        value: `terms served in office, or for spouses, girlfriends etc (as in 前任男友)`,
      },
    ]);
  });

  test(`parses label followed by classifier-for`, () => {
    expect(
      parseCedictV2Gloss(
        `(lit.) classifier for a full circuit or a turn of a coil`,
      ),
    ).toEqual([
      { kind: `label`, value: `lit.` },
      {
        kind: `classifierFor`,
        value: `a full circuit or a turn of a coil`,
      },
    ]);
  });

  test(`parses parenthesized prose followed by classifier-for`, () => {
    expect(
      parseCedictV2Gloss(
        `(on product packaging) classifier for flat items (from Japanese 枚 "mai")`,
      ),
    ).toEqual([
      { kind: `text`, text: `(on product packaging)` },
      {
        kind: `classifierFor`,
        value: `flat items (from Japanese 枚 "mai")`,
      },
    ]);
  });

  test(`parses variant-of with trailing classifier-for as structured token`, () => {
    expect(
      parseCedictV2Gloss(
        `(variant of 出[chu1]) (classifier for plays or chapters of classical novels)`,
      ),
    ).toEqual([
      { kind: `variantOf`, value: `出[chu1]` },
      {
        kind: `classifierFor`,
        value: `plays or chapters of classical novels`,
      },
    ]);
  });

  test(`inline classifier-for in parentheses is extracted`, () => {
    expect(
      parseCedictV2Gloss(`word (classifier for clothes, mats, screens etc)`),
    ).toEqual([
      { kind: `text`, text: `word` },
      {
        kind: `classifierFor`,
        value: `clothes, mats, screens etc`,
      },
    ]);
  });

  test(`repeated parenthesized classifier-for segments are consumed one-by-one`, () => {
    expect(
      parseCedictV2Gloss(`(classifier for foo) (classifier for bar)`),
    ).toEqual([
      {
        kind: `classifierFor`,
        value: `foo`,
      },
      {
        kind: `classifierFor`,
        value: `bar`,
      },
    ]);
  });

  test(`standalone abbr. for gloss produces abbrFor item`, () => {
    expect(
      parseCedictV2Gloss(
        `abbr. for 毛澤東思想概論|毛泽东思想概论[Mao2 Ze2dong1 Si1xiang3 Gai4lun4]`,
      ),
    ).toEqual([
      {
        kind: `abbrFor`,
        value: `毛澤東思想概論|毛泽东思想概论[Mao2 Ze2dong1 Si1xiang3 Gai4lun4]`,
      },
    ]);
  });

  test(`standalone abbr. of gloss normalizes to abbrFor item`, () => {
    expect(
      parseCedictV2Gloss(`abbr. of B型超聲|B型超声[B xing2chao1sheng1]`),
    ).toEqual([
      {
        kind: `abbrFor`,
        value: `B型超聲|B型超声[B xing2chao1sheng1]`,
      },
    ]);
  });

  test(`standalone abbr. to gloss produces abbrTo item`, () => {
    expect(parseCedictV2Gloss(`abbr. to 世博[Shi4bo2]`)).toEqual([
      { kind: `abbrTo`, value: `世博[Shi4bo2]` },
    ]);
  });

  test(`comma prefixed abbr. is extracted`, () => {
    expect(
      parseCedictV2Gloss(
        `China United Airlines, abbr. for 中國聯合航空|中国联合航空[Zhong1guo2 Lian2he2 Hang2kong1]`,
      ),
    ).toEqual([
      { kind: `text`, text: `China United Airlines` },
      {
        kind: `abbrFor`,
        value: `中國聯合航空|中国联合航空[Zhong1guo2 Lian2he2 Hang2kong1]`,
      },
    ]);
  });

  test(`comma suffixed abbr. is extracted`, () => {
    expect(
      parseCedictV2Gloss(
        `abbr. for 中國聯合航空|中国联合航空[Zhong1guo2 Lian2he2 Hang2kong1], China United Airlines`,
      ),
    ).toEqual([
      {
        kind: `abbrFor`,
        value: `中國聯合航空|中国联合航空[Zhong1guo2 Lian2he2 Hang2kong1]`,
      },
      { kind: `text`, text: `China United Airlines` },
    ]);
  });

  test(`comma suffixed abbr. is extracted (with parentheses)`, () => {
    expect(
      parseCedictV2Gloss(
        `/abbr. for 臺灣電視公司|台湾电视公司, Taiwan Television (TTV)/`,
      ),
    ).toEqual([
      {
        kind: `abbrFor`,
        value: `臺灣電視公司|台湾电视公司`,
      },
      { kind: `text`, text: `Taiwan Television (TTV)` },
    ]);
  });

  test(`comma suffixed abbr. is extracted (with parentheses)`, () => {
    expect(
      parseCedictV2Gloss(
        `advanced mathematics (school subject, abbr. for 高等數學|高等数学)`,
      ),
    ).toEqual([
      {
        kind: `text`,
        text: `advanced mathematics (school subject)`,
      },
      {
        kind: `abbrFor`,
        value: `高等數學|高等数学`,
      },
    ]);
  });

  test(`inline abbr. for in parentheses is extracted`, () => {
    expect(
      parseCedictV2Gloss(
        `Selected Works of Mao Zedong (abbr. for 毛澤東選集|毛泽东选集[Mao2 Ze2dong1 Xuan3ji2])`,
      ),
    ).toEqual([
      { kind: `text`, text: `Selected Works of Mao Zedong` },
      {
        kind: `abbrFor`,
        value: `毛澤東選集|毛泽东选集[Mao2 Ze2dong1 Xuan3ji2]`,
      },
    ]);
  });

  test(`parenthesized abbr. for at the start is extracted`, () => {
    expect(
      parseCedictV2Gloss(`(abbr. for 法家[Fa3jia1]) the Legalists`),
    ).toEqual([
      { kind: `abbrFor`, value: `法家[Fa3jia1]` },
      { kind: `text`, text: `the Legalists` },
    ]);
  });

  test(`mixed prose abbr. for parses as an abbreviation token`, () => {
    expect(parseCedictV2Gloss(`abbr. for Tsar or Tsarist Russia`)).toEqual([
      { kind: `abbrFor`, value: `Tsar or Tsarist Russia` },
    ]);
  });

  test(`compound abbr. for with multiple targets parses as one abbreviation token`, () => {
    expect(
      parseCedictV2Gloss(
        `Hong Kong, Zhuhai and Macau (abbr. for 香港[Xiang1gang3] + 珠海[Zhu1hai3] + 澳門|澳门[Ao4men2])`,
      ),
    ).toEqual([
      { kind: `text`, text: `Hong Kong, Zhuhai and Macau` },
      {
        kind: `abbrFor`,
        value: `香港[Xiang1gang3] + 珠海[Zhu1hai3] + 澳門|澳门[Ao4men2]`,
      },
    ]);
  });

  test(`港珠澳 example keeps plus-separated refs in one abbreviation payload`, () => {
    expect(
      parseCedictV2Gloss(
        `Hong Kong, Zhuhai and Macau (abbr. for 香港[Xiang1gang3] + 珠海[Zhu1hai3] + 澳門|澳门[Ao4men2])`,
      ),
    ).toEqual([
      { kind: `text`, text: `Hong Kong, Zhuhai and Macau` },
      {
        kind: `abbrFor`,
        value: `香港[Xiang1gang3] + 珠海[Zhu1hai3] + 澳門|澳门[Ao4men2]`,
      },
    ]);
  });

  test(`95後 example keeps plus-separated refs in one abbreviation payload`, () => {
    expect(
      parseCedictV2Gloss(
        `Gen Z (abbr. for 95後|95后[jiu3wu3hou4] + 00後|00后[ling2ling2hou4])`,
      ),
    ).toEqual([
      { kind: `text`, text: `Gen Z` },
      {
        kind: `abbrFor`,
        value: `95後|95后[jiu3wu3hou4] + 00後|00后[ling2ling2hou4]`,
      },
    ]);
  });

  test(`楚 example keeps prose and refs in one abbreviation payload`, () => {
    expect(
      parseCedictV2Gloss(
        `abbr. for Hubei 湖北省[Hu2bei3 Sheng3] and Hunan 湖南省[Hu2nan2 Sheng3] provinces together`,
      ),
    ).toEqual([
      {
        kind: `abbrFor`,
        value: `Hubei 湖北省[Hu2bei3 Sheng3] and Hunan 湖南省[Hu2nan2 Sheng3] provinces together`,
      },
    ]);
  });

  test(`inline also-pr produces text then alsoPr items`, () => {
    expect(
      parseCedictV2Gloss(`outside (also pr. [wai4mian5] for this sense)`),
    ).toEqual([
      { kind: `text`, text: `outside (also pr. [wai4mian5] for this sense)` },
    ]);
  });

  test(`standalone also-pr gloss produces only alsoPr items`, () => {
    expect(parseCedictV2Gloss(`also pr. [san1 jin1]`)).toEqual([
      { kind: `alsoPr`, value: `san1 jin1` },
    ]);
  });

  test(`standalone generic pr gloss produces only alsoPr items`, () => {
    expect(parseCedictV2Gloss(`pr. [biang4]`)).toEqual([
      { kind: `alsoPr`, value: `biang4`, marker: `generic` },
    ]);
  });

  test(`standalone regional pronunciation gloss includes marker`, () => {
    expect(parseCedictV2Gloss(`Taiwan pr. [huo4]`)).toEqual([
      { kind: `alsoPr`, value: `huo4`, marker: `taiwan` },
    ]);
  });

  test(`standalone ancient pronunciation gloss includes marker`, () => {
    expect(parseCedictV2Gloss(`ancient pr. [shi2]`)).toEqual([
      { kind: `alsoPr`, value: `shi2`, marker: `ancient` },
    ]);
  });

  test(`standalone colloquial pronunciation gloss includes marker`, () => {
    expect(parseCedictV2Gloss(`colloquial pr. [an1]`)).toEqual([
      { kind: `alsoPr`, value: `an1`, marker: `colloquial` },
    ]);
  });

  test(`inline regional pronunciation markers are extracted`, () => {
    expect(parseCedictV2Gloss(`a moment (Taiwan pr. [hui3])`)).toEqual([
      { kind: `text`, text: `a moment` },
      { kind: `alsoPr`, value: `hui3`, marker: `taiwan` },
    ]);
  });

  test(`inline pronunciation markers with trailing prose stay as text`, () => {
    expect(
      parseCedictV2Gloss(
        `to study (from Taiwanese 齧書, Tai-lo pr. [khè-su], lit. to gnaw a book, similar to Mandarin 啃書|啃书[ken3shu1])`,
      ),
    ).toEqual([
      {
        kind: `text`,
        text: `to study (from Taiwanese 齧書, Tai-lo pr. [khè-su], lit. to gnaw a book, similar to Mandarin 啃書|啃书[ken3shu1])`,
      },
    ]);
  });

  test(`inline old pronunciation markers are extracted`, () => {
    expect(parseCedictV2Gloss(`comical (old pr. [gu3 ji1])`)).toEqual([
      { kind: `text`, text: `comical` },
      { kind: `alsoPr`, value: `gu3 ji1`, marker: `old` },
    ]);
  });

  test(`complicated Tai-lo pronunciation markers are not extracted`, () => {
    expect(
      parseCedictV2Gloss(
        `authentic (from Taiwanese, Tai-lo pr. [tsiànn-káng])`,
      ),
    ).toEqual([
      {
        kind: `text`,
        text: `authentic (from Taiwanese, Tai-lo pr. [tsiànn-káng])`,
      },
    ]);
  });

  test(`inline generic pronunciation marker in parentheses is extracted`, () => {
    expect(
      parseCedictV2Gloss(
        `outside (from Taiwanese 烘) (Tai-lo pr. [tsiànn-káng])`,
      ),
    ).toEqual([
      { kind: `text`, text: `outside (from Taiwanese 烘)` },
      { kind: `alsoPr`, value: `tsiànn-káng`, marker: `taiLo` },
    ]);
  });

  test(`inline generic pronunciation marker in parentheses is extracted`, () => {
    expect(parseCedictV2Gloss(`outside (pr. [wai4mian5])`)).toEqual([
      { kind: `text`, text: `outside` },
      { kind: `alsoPr`, value: `wai4mian5`, marker: `generic` },
    ]);
  });

  test(`standalone coll label plus generic pr remains label + alsoPr`, () => {
    expect(parseCedictV2Gloss(`(coll.) pr. [zuo2 liao5]`)).toEqual([
      { kind: `label`, value: `coll.` },
      { kind: `alsoPr`, value: `zuo2 liao5`, marker: `generic` },
    ]);
  });

  test(`standalone variant-of gloss produces variantOf item`, () => {
    expect(parseCedictV2Gloss(`variant of 餵|喂[wei4]`)).toEqual([
      { kind: `variantOf`, value: `餵|喂[wei4]` },
    ]);
  });

  test(`standalone see gloss produces see item`, () => {
    expect(parseCedictV2Gloss(`see 筊杯[jiao3bei1]`)).toEqual([
      { kind: `see`, value: `筊杯[jiao3bei1]` },
    ]);
  });

  test(`inline see produces text then see item`, () => {
    expect(parseCedictV2Gloss(`mythical animal (see 獬豸[xie4zhi4])`)).toEqual([
      { kind: `text`, text: `mythical animal` },
      { kind: `see`, value: `獬豸[xie4zhi4]` },
    ]);
  });

  test(`standalone see also gloss produces seeAlso item`, () => {
    expect(parseCedictV2Gloss(`see also 槲樹|槲树[hu2shu4]`)).toEqual([
      { kind: `seeAlso`, value: `槲樹|槲树[hu2shu4]` },
    ]);
  });

  test(`standalone also written with trad-simp ref produces alsoWritten item`, () => {
    expect(parseCedictV2Gloss(`also written 三疊紀|三叠纪`)).toEqual([
      { kind: `alsoWritten`, value: `三疊紀|三叠纪` },
    ]);
  });

  test(`standalone also written with pinyin ref produces alsoWritten item`, () => {
    expect(parseCedictV2Gloss(`also written 二簧[er4huang2]`)).toEqual([
      { kind: `alsoWritten`, value: `二簧[er4huang2]` },
    ]);
  });

  test(`standalone also written with plain hanzi ref produces alsoWritten item`, () => {
    expect(parseCedictV2Gloss(`also written 西斯汀`)).toEqual([
      { kind: `alsoWritten`, value: `西斯汀` },
    ]);
  });

  test(`standalone also written with middle-dot name ref produces alsoWritten item`, () => {
    expect(parseCedictV2Gloss(`also written 斯文·赫定`)).toEqual([
      { kind: `alsoWritten`, value: `斯文·赫定` },
    ]);
  });

  test(`standalone also written with or between refs preserves both refs in alsoWritten item`, () => {
    expect(
      parseCedictV2Gloss(
        `also written 神權統治|神权统治[shen2quan2tong3zhi4] or 神權政治|神权政治[shen2quan2zheng4zhi4]`,
      ),
    ).toEqual([
      {
        kind: `alsoWritten`,
        value: `神權統治|神权统治[shen2quan2tong3zhi4] or 神權政治|神权政治[shen2quan2zheng4zhi4]`,
      },
    ]);
  });

  test(`standalone also written prose stays plain text`, () => {
    expect(parseCedictV2Gloss(`also written as`)).toEqual([
      { kind: `text`, text: `also written as` },
    ]);
  });

  test(`inline parenthesized also written produces alsoWritten item`, () => {
    expect(
      parseCedictV2Gloss(
        `designed to have a card inserted (also written 插卡式[cha1ka3shi4])`,
      ),
    ).toEqual([
      { kind: `text`, text: `designed to have a card inserted` },
      { kind: `alsoWritten`, value: `插卡式[cha1ka3shi4]` },
    ]);
  });

  test(`standalone parenthesized also written with multiple refs produces alsoWritten items`, () => {
    expect(
      parseCedictV2Gloss(
        `(also written 嵐毘尼|岚毗尼[Lan2pi2ni2],臘伐尼|腊伐尼[La4fa2ni2], 林微尼[Lin2wei1ni2])`,
      ),
    ).toEqual([
      {
        kind: `alsoWritten`,
        value: `嵐毘尼|岚毗尼[Lan2pi2ni2],臘伐尼|腊伐尼[La4fa2ni2], 林微尼[Lin2wei1ni2]`,
      },
    ]);
  });

  test(`inline parenthesized also written list parses in Lumbini gloss`, () => {
    expect(
      parseCedictV2Gloss(
        `Lumbini, Nepal, birthplace of Siddhartha Gautama 釋迦牟尼|释迦牟尼[Shi4jia1mou2ni2] founder of Buddhism (also written 嵐毘尼|岚毗尼[Lan2pi2ni2],臘伐尼|腊伐尼[La4fa2ni2],林微尼[Lin2wei1ni2, 林微尼[Lin2wei1ni2])`,
      ),
    ).toEqual([
      {
        kind: `text`,
        text: `Lumbini, Nepal, birthplace of Siddhartha Gautama 釋迦牟尼|释迦牟尼[Shi4jia1mou2ni2] founder of Buddhism`,
      },
      {
        kind: `alsoWritten`,
        value: `嵐毘尼|岚毗尼[Lan2pi2ni2],臘伐尼|腊伐尼[La4fa2ni2],林微尼[Lin2wei1ni2, 林微尼[Lin2wei1ni2]`,
      },
    ]);
  });

  test(`inline see also produces text then seeAlso item`, () => {
    expect(
      parseCedictV2Gloss(
        `the most handsome boy in the school (see also 校花[xiao4hua1])`,
      ),
    ).toEqual([
      { kind: `text`, text: `the most handsome boy in the school` },
      { kind: `seeAlso`, value: `校花[xiao4hua1]` },
    ]);
  });

  test(`parenthesized usedIn with text remainder`, () => {
    expect(
      parseCedictV2Gloss(`(used in 籠子|笼子[long3zi5]) large box`),
    ).toEqual([
      { kind: `usedIn`, value: `籠子|笼子[long3zi5]` },
      { kind: `text`, text: `large box` },
    ]);
  });

  test(`usedIn with text remainder`, () => {
    expect(parseCedictV2Gloss(`used in 籠子|笼子[long3zi5] large box`)).toEqual(
      [
        { kind: `usedIn`, value: `籠子|笼子[long3zi5]` },
        { kind: `text`, text: `large box` },
      ],
    );
  });

  test(`usedIn comma boundary keeps comma in trailing text`, () => {
    expect(parseCedictV2Gloss(`used in 芙蓉[fu2rong2], lotus`)).toEqual([
      { kind: `usedIn`, value: `芙蓉[fu2rong2]` },
      { kind: `text`, text: `, lotus` },
    ]);
  });

  test(`standalone used in gloss with ref produces usedIn item`, () => {
    expect(parseCedictV2Gloss(`used in 刺棱[ci1leng1]`)).toEqual([
      { kind: `usedIn`, value: `刺棱[ci1leng1]` },
    ]);
  });

  test(`standalone used in gloss without ref stays as plain text`, () => {
    expect(parseCedictV2Gloss(`used in place names`)).toEqual([
      { kind: `text`, text: `used in place names` },
    ]);
  });

  test(`used in transliteration phrase stays as plain text`, () => {
    expect(
      parseCedictV2Gloss(`used in the transliteration of Greek letters`),
    ).toEqual([
      {
        kind: `text`,
        text: `used in the transliteration of Greek letters`,
      },
    ]);
  });

  test(`inline used in with non-ref content stays plain text`, () => {
    expect(parseCedictV2Gloss(`orange peel (used in TCM)`)).toEqual([
      { kind: `text`, text: `orange peel (used in TCM)` },
    ]);
  });

  test(`used in in mixed parenthetical sentence stays plain text`, () => {
    expect(
      parseCedictV2Gloss(
        `(Tw) Veterans General Hospital (used in the names of hospitals in Taipei, Taichung etc) (abbr. for 榮民總醫院|荣民总医院[Rong2min2 Zong3yi1yuan4])`,
      ),
    ).toEqual([
      { kind: `label`, value: `Tw` },
      {
        kind: `text`,
        text: `Veterans General Hospital (used in the names of hospitals in Taipei, Taichung etc)`,
      },
      {
        kind: `abbrFor`,
        value: `榮民總醫院|荣民总医院[Rong2min2 Zong3yi1yuan4]`,
      },
    ]);
  });

  test(`old variant-of emits old label then variantOf`, () => {
    expect(parseCedictV2Gloss(`old variant of 五[wu3]`)).toEqual([
      { kind: `label`, value: `old` },
      { kind: `variantOf`, value: `五[wu3]` },
    ]);
  });

  test(`preceding label before variant-of emits emits label then variantOf`, () => {
    expect(parseCedictV2Gloss(`(lit.) variant of 五[wu3]`)).toEqual([
      { kind: `label`, value: `lit.` },
      { kind: `variantOf`, value: `五[wu3]` },
    ]);
  });

  test(`wrapped old variant-of emits old label then variantOf`, () => {
    expect(parseCedictV2Gloss(`(old) (variant of 五[wu3])`)).toEqual([
      { kind: `label`, value: `old` },
      { kind: `variantOf`, value: `五[wu3]` },
    ]);
  });

  test(`variant-of with trailing text`, () => {
    expect(parseCedictV2Gloss(`variant of 吆[yao1], to shout`)).toEqual([
      { kind: `variantOf`, value: `吆[yao1]` },
      { kind: `text`, text: `to shout` },
    ]);
  });

  test(`standalone erhua variant-of gloss produces erhuaVariantOf item`, () => {
    expect(
      parseCedictV2Gloss(
        `erhua variant of 探頭探腦|探头探脑[tan4tou2tan4nao3]`,
      ),
    ).toEqual([
      {
        kind: `erhuaVariantOf`,
        value: `探頭探腦|探头探脑[tan4tou2tan4nao3]`,
      },
    ]);
  });

  test(`erhua variant-of with trailing text`, () => {
    expect(
      parseCedictV2Gloss(`erhua variant of 擺譜|摆谱[bai3pu3], swagger`),
    ).toEqual([
      { kind: `erhuaVariantOf`, value: `擺譜|摆谱[bai3pu3]` },
      { kind: `text`, text: `swagger` },
    ]);
  });
});

describe(`parseCedictV2Sense`, () => {
  test(`text-only sense produces a single text item`, () => {
    expect(parseCedictV2Sense(`to walk`)).toEqual([
      { tokens: [{ kind: `text`, text: `to walk` }] },
    ]);
  });

  test(`multiple glosses produce multiple arrays`, () => {
    expect(parseCedictV2Sense(`marriage; matrimony`)).toEqual([
      { tokens: [{ kind: `text`, text: `marriage` }] },
      { tokens: [{ kind: `text`, text: `matrimony` }] },
    ]);
  });

  test(`学问 example: two glosses with mixed items`, () => {
    const sense = `a body of specialized knowledge (CL:門|门[men2]); (fig.) any activity that demands expertise, skill or experience (e.g. gathering forensic evidence, selecting clothing, managing relationships)`;
    expect(parseCedictV2Sense(sense)).toEqual([
      {
        tokens: [
          { kind: `text`, text: `a body of specialized knowledge` },
          { kind: `usesClassifier`, value: `門|门[men2]` },
        ],
      },
      {
        tokens: [
          { kind: `label`, value: `fig.` },
          {
            kind: `text`,
            text: `any activity that demands expertise, skill or experience (e.g. gathering forensic evidence, selecting clothing, managing relationships)`,
          },
        ],
      },
    ]);
  });

  test(`returns null for empty input`, () => {
    expect(serializeCedictV2Sense([])).toBeNull();
  });

  test.for([
    // suffix label (end position — v2 preserves position)
    [`gloss (suffix)`, `gloss {{suffix}}`],
    // domain labels
    [`(ACG) gloss`, `{{ACG}} gloss`],
    [`(accounting) gloss`, `{{accounting}} gloss`],
    [`(acoustics) gloss`, `{{acoustics}} gloss`],
    [`(acrobatics) gloss`, `{{acrobatics}} gloss`],
    [`(aerospace) gloss`, `{{aerospace}} gloss`],
    [`(agriculture) gloss`, `{{agriculture}} gloss`],
    [`(anatomy) gloss`, `{{anatomy}} gloss`],
    [`(angling) gloss`, `{{angling}} gloss`],
    [`(animals) gloss`, `{{animals}} gloss`],
    [`(archaeology) gloss`, `{{archaeology}} gloss`],
    [`(archeology) gloss`, `{{archeology}} gloss`],
    [`(archery) gloss`, `{{archery}} gloss`],
    [`(architecture) gloss`, `{{architecture}} gloss`],
    [`(astronautics) gloss`, `{{astronautics}} gloss`],
    [`(astronomy) gloss`, `{{astronomy}} gloss`],
    [`(athletics) gloss`, `{{athletics}} gloss`],
    [`(automotive) gloss`, `{{automotive}} gloss`],
    [`(aviation) gloss`, `{{aviation}} gloss`],
    [`(ballet) gloss`, `{{ballet}} gloss`],
    [`(banking) gloss`, `{{banking}} gloss`],
    [`(baseball) gloss`, `{{baseball}} gloss`],
    [`(basketball) gloss`, `{{basketball}} gloss`],
    [`(basketwork) gloss`, `{{basketwork}} gloss`],
    [`(BDSM) gloss`, `{{BDSM}} gloss`],
    [`(beer) gloss`, `{{beer}} gloss`],
    [`(biochemistry) gloss`, `{{biochemistry}} gloss`],
    [`(biogeography) gloss`, `{{biogeography}} gloss`],
    [`(biology) gloss`, `{{biology}} gloss`],
    [`(biotechnology) gloss`, `{{biotechnology}} gloss`],
    [`(bird) gloss`, `{{bird}} gloss`],
    [`(botany) gloss`, `{{botany}} gloss`],
    [`(boxing) gloss`, `{{boxing}} gloss`],
    [`(brand) gloss`, `{{brand}} gloss`],
    [`(broadcasting) gloss`, `{{broadcasting}} gloss`],
    [`(Buddhism) gloss`, `{{Buddhism}} gloss`],
    [`(Buddhist) gloss`, `{{Buddhist}} gloss`],
    [`(business) gloss`, `{{business}} gloss`],
    [`(calligraphy) gloss`, `{{calligraphy}} gloss`],
    [`(Cant.) gloss`, `{{Cantonese}} gloss`],
    [`(Cantonese) gloss`, `{{Cantonese}} gloss`],
    [`(cartography) gloss`, `{{cartography}} gloss`],
    [`(Catholicism) gloss`, `{{Catholicism}} gloss`],
    [`(chemical) gloss`, `{{chemical}} gloss`],
    [`(chemistry) gloss`, `{{chemistry}} gloss`],
    [`(Chinese) gloss`, `{{Chinese}} gloss`],
    [`(Christianity) gloss`, `{{Christianity}} gloss`],
    [`(cinema) gloss`, `{{cinema}} gloss`],
    [`(cinematography) gloss`, `{{cinematography}} gloss`],
    [`(color) gloss`, `{{color}} gloss`],
    [`(commerce) gloss`, `{{commerce}} gloss`],
    [`(communications) gloss`, `{{communications}} gloss`],
    [`(computer) gloss`, `{{computer}} gloss`],
    [`(computing) gloss`, `{{computing}} gloss`],
    [`(Confucianism) gloss`, `{{Confucianism}} gloss`],
    [`(constellation) gloss`, `{{constellation}} gloss`],
    [`(cookery) gloss`, `{{cookery}} gloss`],
    [`(cooking) gloss`, `{{cooking}} gloss`],
    [`(cosmetics) gloss`, `{{cosmetics}} gloss`],
    [`(cryptography) gloss`, `{{cryptography}} gloss`],
    [`(cuisine) gloss`, `{{cuisine}} gloss`],
    [`(currency) gloss`, `{{currency}} gloss`],
    [`(Daoism) gloss`, `{{Daoism}} gloss`],
    [`(dating) gloss`, `{{dating}} gloss`],
    [`(deferential) gloss`, `{{deferential}} gloss`],
    [`(dentistry) gloss`, `{{dentistry}} gloss`],
    [`(dinosaur) gloss`, `{{dinosaur}} gloss`],
    [`(divination) gloss`, `{{divination}} gloss`],
    [`(diving) gloss`, `{{diving}} gloss`],
    [`(ecology) gloss`, `{{ecology}} gloss`],
    [`(economics) gloss`, `{{economics}} gloss`],
    [`(education) gloss`, `{{education}} gloss`],
    [`(electricity) gloss`, `{{electricity}} gloss`],
    [`(electromagnetism) gloss`, `{{electromagnetism}} gloss`],
    [`(electronics) gloss`, `{{electronics}} gloss`],
    [`(embryology) gloss`, `{{embryology}} gloss`],
    [`(engineering) gloss`, `{{engineering}} gloss`],
    [`(entomology) gloss`, `{{entomology}} gloss`],
    [`(epidemiology) gloss`, `{{epidemiology}} gloss`],
    [`(expletive) gloss`, `{{expletive}} gloss`],
    [`(fandom) gloss`, `{{fandom}} gloss`],
    [`(fashion) gloss`, `{{fashion}} gloss`],
    [`(fencing) gloss`, `{{fencing}} gloss`],
    [`(filmmaking) gloss`, `{{filmmaking}} gloss`],
    [`(finance) gloss`, `{{finance}} gloss`],
    [`(fitness) gloss`, `{{fitness}} gloss`],
    [`(flying) gloss`, `{{flying}} gloss`],
    [`(food) gloss`, `{{food}} gloss`],
    [`(football) gloss`, `{{football}} gloss`],
    [`(forestry) gloss`, `{{forestry}} gloss`],
    [`(gaming) gloss`, `{{gaming}} gloss`],
    [`(genetic) gloss`, `{{genetic}} gloss`],
    [`(genetics) gloss`, `{{genetics}} gloss`],
    [`(geography) gloss`, `{{geography}} gloss`],
    [`(geology) gloss`, `{{geology}} gloss`],
    [`(geometry) gloss`, `{{geometry}} gloss`],
    [`(geopolitics) gloss`, `{{geopolitics}} gloss`],
    [`(geotectonics) gloss`, `{{geotectonics}} gloss`],
    [`(golf) gloss`, `{{golf}} gloss`],
    [`(government) gloss`, `{{government}} gloss`],
    [`(grammar) gloss`, `{{grammar}} gloss`],
    [`(gymnastics) gloss`, `{{gymnastics}} gloss`],
    [`(hairstyle) gloss`, `{{hairstyle}} gloss`],
    [`(historical) gloss`, `{{historical}} gloss`],
    [`(HK) gloss`, `{{HK}} gloss`],
    [`(Hong Kong) gloss`, `{{HK}} gloss`],
    [`(horticulture) gloss`, `{{horticulture}} gloss`],
    [`(humor) gloss`, `{{humor}} gloss`],
    [`(humorous) gloss`, `{{humor}} gloss`],
    [`(hydrology) gloss`, `{{hydrology}} gloss`],
    [`(ichthyology) gloss`, `{{ichthyology}} gloss`],
    [`(immunology) gloss`, `{{immunology}} gloss`],
    [`(information) gloss`, `{{information}} gloss`],
    [`(Internet slang) gloss`, `{{Internet slang}} gloss`],
    [`(Islam) gloss`, `{{Islam}} gloss`],
    [`(Japan) gloss`, `{{Japan}} gloss`],
    [`(journalism) gloss`, `{{journalism}} gloss`],
    [`(law) gloss`, `{{law}} gloss`],
    [`(lexicography) gloss`, `{{lexicography}} gloss`],
    [`(linguistics) gloss`, `{{linguistics}} gloss`],
    [`(logistics) gloss`, `{{logistics}} gloss`],
    [`(mahjong) gloss`, `{{mahjong}} gloss`],
    [`(Malaysia) gloss`, `{{Malaysia}} gloss`],
    [`(mammology) gloss`, `{{mammology}} gloss`],
    [`(manufacturing) gloss`, `{{manufacturing}} gloss`],
    [`(Maoism) gloss`, `{{Maoism}} gloss`],
    [`(marketing) gloss`, `{{marketing}} gloss`],
    [`(math) gloss`, `{{math.}} gloss`],
    [`(math.) gloss`, `{{math.}} gloss`],
    [`(mathematical) gloss`, `{{math.}} gloss`],
    [`(measurement) gloss`, `{{measurement}} gloss`],
    [`(mechanics) gloss`, `{{mechanics}} gloss`],
    [`(med) gloss`, `{{medical}} gloss`],
    [`(med.) gloss`, `{{medical}} gloss`],
    [`(medical) gloss`, `{{medical}} gloss`],
    [`(medicine) gloss`, `{{medical}} gloss`],
    [`(metallurgy) gloss`, `{{metallurgy}} gloss`],
    [`(metalwork) gloss`, `{{metalwork}} gloss`],
    [`(meteorology) gloss`, `{{meteorology}} gloss`],
    [`(microbiology) gloss`, `{{microbiology}} gloss`],
    [`(military) gloss`, `{{military}} gloss`],
    [`(mineralogy) gloss`, `{{mineralogy}} gloss`],
    [`(mining) gloss`, `{{mining}} gloss`],
    [`(Mohism) gloss`, `{{Mohism}} gloss`],
    [`(music) gloss`, `{{music}} gloss`],
    [`(mycology) gloss`, `{{mycology}} gloss`],
    [`(mythology) gloss`, `{{mythology}} gloss`],
    [`(neologism) gloss`, `{{neologism}} gloss`],
    [`(neuroscience) gloss`, `{{neuroscience}} gloss`],
    [`(obstetrics) gloss`, `{{obstetrics}} gloss`],
    [`(oceanography) gloss`, `{{oceanography}} gloss`],
    [`(opera) gloss`, `{{opera}} gloss`],
    [`(optics) gloss`, `{{optics}} gloss`],
    [`(ornithology) gloss`, `{{ornithology}} gloss`],
    [`(orthodontics) gloss`, `{{orthodontics}} gloss`],
    [`(orthography) gloss`, `{{orthography}} gloss`],
    [`(painting) gloss`, `{{painting}} gloss`],
    [`(perfumery) gloss`, `{{perfumery}} gloss`],
    [`(petrochemistry) gloss`, `{{petrochemistry}} gloss`],
    [`(pharm.) gloss`, `{{pharmacology}} gloss`],
    [`(pharmacology) gloss`, `{{pharmacology}} gloss`],
    [`(philately) gloss`, `{{philately}} gloss`],
    [`(philosophy) gloss`, `{{philosophy}} gloss`],
    [`(phonetic) gloss`, `{{phonetic}} gloss`],
    [`(phonetics) gloss`, `{{phonetics}} gloss`],
    [`(phonology) gloss`, `{{phonology}} gloss`],
    [`(photography) gloss`, `{{photography}} gloss`],
    [`(physics) gloss`, `{{physics}} gloss`],
    [`(physiognomy) gloss`, `{{physiognomy}} gloss`],
    [`(physiology) gloss`, `{{physiology}} gloss`],
    [`(political) gloss`, `{{politics}} gloss`],
    [`(politically) gloss`, `{{politics}} gloss`],
    [`(politics) gloss`, `{{politics}} gloss`],
    [`(PRC) gloss`, `{{PRC}} gloss`],
    [`(printing) gloss`, `{{printing}} gloss`],
    [`(psychological) gloss`, `{{psychological}} gloss`],
    [`(psychology) gloss`, `{{psychology}} gloss`],
    [`(publishing) gloss`, `{{publishing}} gloss`],
    [`(radiography) gloss`, `{{radiography}} gloss`],
    [`(religion) gloss`, `{{religion}} gloss`],
    [`(religious) gloss`, `{{religion}} gloss`],
    [`(retail) gloss`, `{{retail}} gloss`],
    [`(retailer) gloss`, `{{retailer}} gloss`],
    [`(retailing) gloss`, `{{retailing}} gloss`],
    [`(rocketry) gloss`, `{{rocketry}} gloss`],
    [`(science) gloss`, `{{science}} gloss`],
    [`(seafood) gloss`, `{{seafood}} gloss`],
    [`(seismology) gloss`, `{{seismology}} gloss`],
    [`(semantics) gloss`, `{{semantics}} gloss`],
    [`(Shanghainese) gloss`, `{{Shanghainese}} gloss`],
    [`(Shinto) gloss`, `{{Shinto}} gloss`],
    [`(Singapore) gloss`, `{{Singapore}} gloss`],
    [`(soccer) gloss`, `{{soccer}} gloss`],
    [`(software) gloss`, `{{software}} gloss`],
    [`(sports) gloss`, `{{sport}} gloss`],
    [`(sport) gloss`, `{{sport}} gloss`],
    [`(stationery) gloss`, `{{stationery}} gloss`],
    [`(statistics) gloss`, `{{statistics}} gloss`],
    [`(surname) gloss`, `{{surname}} gloss`],
    [`(surveying) gloss`, `{{surveying}} gloss`],
    [`(Taiwan) gloss`, `{{Taiwan}} gloss`],
    [`(Taoism) gloss`, `{{Taoism}} gloss`],
    [`(TCM) gloss`, `{{TCM}} gloss`],
    [`(technology) gloss`, `{{technology}} gloss`],
    [`(telecommunications) gloss`, `{{telecommunications}} gloss`],
    [`(telephony) gloss`, `{{telephony}} gloss`],
    [`(textiles) gloss`, `{{textiles}} gloss`],
    [`(theater) gloss`, `{{theater}} gloss`],
    [`(thermodynamics) gloss`, `{{thermodynamics}} gloss`],
    [`(time) gloss`, `{{time}} gloss`],
    [`(transportation) gloss`, `{{transportation}} gloss`],
    [`(Tw) gloss`, `{{Tw}} gloss`],
    [`(typesetting) gloss`, `{{typesetting}} gloss`],
    [`(typography) gloss`, `{{typography}} gloss`],
    [`(vulgar) gloss`, `{{vulgar}} gloss`],
    [`(watchmaking) gloss`, `{{watchmaking}} gloss`],
    [`(weaving) gloss`, `{{weaving}} gloss`],
    [`(zoology) gloss`, `{{zoology}} gloss`],
    // generic labels
    [`(adj.) gloss`, `{{adjective}} gloss`],
    [`(adjective) gloss`, `{{adjective}} gloss`],
    [`(ancient) gloss`, `{{ancient}} gloss`],
    [`(arch.) gloss`, `{{archaic}} gloss`],
    [`(archaic) gloss`, `{{archaic}} gloss`],
    [`(article) gloss`, `{{article}} gloss`],
    [`(attributive) gloss`, `{{attributive}} gloss`],
    [`(bound form) gloss`, `{{bound form}} gloss`],
    [`(classical) gloss`, `{{classical}} gloss`],
    [`(classifier) gloss`, `{{classifier}} gloss`],
    [`(coll.) gloss`, `{{coll.}} gloss`],
    [`(colloquial) gloss`, `{{coll.}} gloss`],
    [`(conjunction) gloss`, `{{conjunction}} gloss`],
    [`(contemporary) gloss`, `{{contemporary}} gloss`],
    [`(courteous) gloss`, `{{courteous}} gloss`],
    [`(dated) gloss`, `{{dated}} gloss`],
    [`(derog.) gloss`, `{{derogatory}} gloss`],
    [`(derogatory) gloss`, `{{derogatory}} gloss`],
    [`(dialect) gloss`, `{{dialect}} gloss`],
    [`(directional complement) gloss`, `{{directional complement}} gloss`],
    [`(disparaging) gloss`, `{{disparaging}} gloss`],
    [`(euphemism) gloss`, `{{euphemism}} gloss`],
    [`(fig.) gloss`, `{{fig.}} gloss`],
    [`(figuratively) gloss`, `{{fig.}} gloss`],
    [`(formal) gloss`, `{{formal}} gloss`],
    [`(grammatical) gloss`, `{{grammatical}} gloss`],
    [`(greeting) gloss`, `{{greeting}} gloss`],
    [`(honorific) gloss`, `{{honorific}} gloss`],
    [`(idiom) gloss`, `{{idiom}} gloss`],
    [`(imperative) gloss`, `{{imperative}} gloss`],
    [`(informal) gloss`, `{{informal}} gloss`],
    [`(insult) gloss`, `{{insult}} gloss`],
    [`(intensifier) gloss`, `{{intensifier}} gloss`],
    [`(interj) gloss`, `{{interj.}} gloss`],
    [`(interj.) gloss`, `{{interj.}} gloss`],
    [`(interjection) gloss`, `{{interj.}} gloss`],
    [`(intransitive) gloss`, `{{intransitive}} gloss`],
    [`(jocular) gloss`, `{{jocular}} gloss`],
    [`(jokingly) gloss`, `{{jokingly}} gloss`],
    [`(lit.) gloss`, `{{lit.}} gloss`],
    [`(literary) gloss`, `{{lit.}} gloss`],
    [`(loanword) gloss`, `{{loanword}} gloss`],
    [`(maxim) gloss`, `{{maxim}} gloss`],
    [`(metaphorical) gloss`, `{{metaphorical}} gloss`],
    [`(metonym) gloss`, `{{metonym}} gloss`],
    [`(modern) gloss`, `{{modern}} gloss`],
    [`(name) gloss`, `{{name}} gloss`],
    [`(noun suffix) gloss`, `{{noun suffix}} gloss`],
    [`(offensive) gloss`, `{{offensive}} gloss`],
    [`(old) gloss`, `{{old}} gloss`],
    [`(onom.) gloss`, `{{onom.}} gloss`],
    [`(orig.) gloss`, `{{orig.}} gloss`],
    [`(originally) gloss`, `{{orig.}} gloss`],
    [`(pejorative) gloss`, `{{pejorative}} gloss`],
    [`(polite) gloss`, `{{polite}} gloss`],
    [`(prefix) gloss`, `{{prefix}} gloss`],
    [`(pronoun) gloss`, `{{pronoun}} gloss`],
    [`(proverb) gloss`, `{{proverb}} gloss`],
    [`(punctuation) gloss`, `{{punctuation}} gloss`],
    [`(rare) gloss`, `{{rare}} gloss`],
    [`(reduplicated) gloss`, `{{reduplicated}} gloss`],
    [`(respectful) gloss`, `{{respectful}} gloss`],
    [`(rhetorical) gloss`, `{{rhetorical}} gloss`],
    [`(rude) gloss`, `{{rude}} gloss`],
    [`(saying) gloss`, `{{saying}} gloss`],
    [`(slang) gloss`, `{{slang}} gloss`],
    [`(specifier) gloss`, `{{specifier}} gloss`],
    [`(suffix) gloss`, `{{suffix}} gloss`],
    [`(technical) gloss`, `{{technical}} gloss`],
    [`(verb) gloss`, `{{verb}} gloss`],
    // extracts multiple labels at start
    [
      `(biology) (loanword) to clone; a clone`,
      `{{biology}} {{loanword}} to clone; a clone`,
    ],
    // end-position labels stay at end (v2 preserves position)
    [`gloss 1 (idiom); (fig.) gloss 2`, `gloss 1 {{idiom}}; {{fig.}} gloss 2`],
    [`normal gloss; (idiom)`, `normal gloss; {{idiom}}`],
    // domain labels stay on the specific gloss they annotate
    [
      `to conserve; to preserve; to keep; to store; (computing) to save (a file etc)`,
      `to conserve; to preserve; to keep; to store; {{computing}} to save (a file etc)`,
    ],
    // unknown labels are left as-is
    [`(horse)`, `(horse)`],
    // just a label
    [`(onom.)`, `{{onom.}}`],
    // A label by itself doesn't turn into a label.
    [`surname`, `surname`],
    // Surname label works without parentheses if followed by a capitalized word
    [`surname Du`, `{{surname}} Du`],
    // Lowercase words after surname should remain plain text
    [`surname du`, `surname du`],
    // Regression: normal labels preceding a proper name shouldn't turn into a label.
    [
      `Chinese People's Armed Police Force (PAP, aka CAPF)`,
      `Chinese People's Armed Police Force (PAP, aka CAPF)`,
    ],
    // "old" prefix isn't always turned into a label
    [`old fogey`, `old fogey`],
    [`old ways`, `old ways`],
    [`old term for northern peoples`, `old term for northern peoples`],
    [`old man`, `old man`],
    [
      `(Internet slang) variant of 辱華|辱华[ru3 Hua2], to insult China`,
      `{{Internet slang}} {{variant of 辱華|辱华[ru3 Hua2]}} to insult China`,
    ],
    [
      `variant of 太平洋週邊|太平洋周边[Tai4ping2 Yang2 Zhou1bian1], Pacific Rim`,
      `{{variant of 太平洋週邊|太平洋周边[Tai4ping2 Yang2 Zhou1bian1]}} Pacific Rim`,
    ],
    // wrapped old variant-of preserves trailing labels
    [
      `(old) (variant of 五[wu3]) (lit.)`,
      `{{old}} {{variant of 五[wu3]}} {{lit.}}`,
    ],
    // old variant-of without pinyin
    [`old variant of 許|许`, `{{old}} {{variant of 許|许}}`],
    // old variant-of with only single hanzi
    [`old variant of 翌`, `{{old}} {{variant of 翌}}`],
    [
      `old variant of 大阪[Da4ban3] (Osaka, city in Japan), used prior to the Meiji era`,
      `{{old}} {{variant of 大阪[Da4ban3]}} (Osaka, city in Japan), used prior to the Meiji era`,
    ],
    [
      `variant of 心怦怦跳[xin1peng1peng1tiao4]`,
      `{{variant of 心怦怦跳[xin1peng1peng1tiao4]}}`,
    ],
    [
      `variant of 懈[xie4] and 邂[xie4] (old)`,
      `{{variant of 懈[xie4],邂[xie4]}} {{old}}`,
    ],
    // old variant-of with trailing text preserves trailing gloss
    [
      `old variant of 贏|赢[ying2], to win, to profit`,
      `{{old}} {{variant of 贏|赢[ying2]}} to win, to profit`,
    ],
    // normalizes old variant-of serialization
    [`old variant of 五[wu3]`, `{{old}} {{variant of 五[wu3]}}`],
    // normalizes parenthesis old variant-of serialization
    [
      `fruit (old variant of 果[guo3])`,
      `fruit {{old}} {{variant of 果[guo3]}}`,
    ],
    // normalizes parenthesis old variant-of serialization with trailing labels
    [
      `fruit (old variant of 果[guo3]) (lit.)`,
      `fruit {{old}} {{variant of 果[guo3]}} {{lit.}}`,
    ],
    [`variant of 岡|冈[gang1]`, `{{variant of 岡|冈[gang1]}}`],
    [`see also 槲樹|槲树[hu2shu4]`, `{{see also 槲樹|槲树[hu2shu4]}}`],
    [`used in 刺棱[ci1leng1]`, `{{used in 刺棱[ci1leng1]}}`],
    [`orange peel (used in TCM)`, `orange peel (used in TCM)`],
    [
      `used in 傢伙|家伙[jia1huo5] and 傢俱|家俱[jia1ju4]`,
      `{{used in 傢伙|家伙[jia1huo5],傢俱|家俱[jia1ju4]}}`,
    ],
    [
      `(Tw) performance assessment and discipline (abbr. for 考核[kao3he2] + 紀律|纪律[ji4lu:4]), used in reference to internal review and oversight functions within political parties`,
      `{{Tw}} performance assessment and discipline {{abbr. for 考核[kao3he2] + 紀律|纪律[ji4lu:4]}}, used in reference to internal review and oversight functions within political parties`,
    ],
    [
      // Accidental whitespace should be left alone, not auto-trimmed by the serializer.
      `inequality sign (≠, < , ≤, >, ≥)`,
      `inequality sign (≠, < , ≤, >, ≥)`,
    ],
    [
      // abbr. is parsed as a label after abbrTo or abbrFor parsing.
      `abbr. for 懈[xie4]`,
      `{{abbr. for 懈[xie4]}}`,
    ],
    [
      // abbr. is parsed as a label after abbrTo or abbrFor parsing.
      `(abbr.) ABC`,
      `{{abbr.}} ABC`,
    ],
  ] as [string, string][])(`debug fixture: %s → %s`, ([input, expected]) => {
    const actual = serializeCedictV2Sense(parseCedictV2Sense(input), {
      debug: true,
    });

    expect(actual).toBe(expected);
  });
});

describe(`applyCedictV2EditsToText sense serialization`, () => {
  test(`preserves end marker gloss text in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /example text (idiom); more text/`;
    const parsed = parseCedictV2Text(input, { strict: true });
    const output = serializeCedictV2Entries(applyCedictV2EditsToText(parsed));
    expect(output).toMatchInlineSnapshot(
      `"示例 示例 [[shi4li4]] /example text (idiom); more text/"`,
    );
  });

  test(`preserves middle marker gloss text in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /lit. to do something (idiom); to achieve a result/`;
    const parsed = parseCedictV2Text(input, { strict: true });
    const output = serializeCedictV2Entries(applyCedictV2EditsToText(parsed));
    expect(output).toMatchInlineSnapshot(
      `"示例 示例 [[shi4li4]] /(lit.) to do something (idiom); to achieve a result/"`,
    );
  });

  test(`preserves gloss without labels unchanged`, () => {
    const input = `示例 示例 [[shi4li4]] /plain gloss/`;
    const parsed = parseCedictV2Text(input, { strict: true });
    const output = serializeCedictV2Entries(applyCedictV2EditsToText(parsed));
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

    expect(buildCedictV2EntryId(first!)).toEqual(`行 行 [[xing2]]`);
    expect(buildCedictV2EntryId(second!)).toEqual(`行 行 [[xing2]]`);
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

  test(`baseline histogram for likely over-split definitions by sense count`, async () => {
    const items = await loadCedictV2();

    const histogram = new Map<number, { count: number; examples: string[] }>();
    for (const entry of items) {
      if (!isLikelyOverSplitCedictEntry(entry)) {
        continue;
      }

      const senseCount = entry.senses.length;
      const bucket = histogram.get(senseCount) ?? { count: 0, examples: [] };
      bucket.count += 1;

      if (bucket.examples.length < 3) {
        bucket.examples.push(
          `${entry.traditional} ${entry.simplified} [[${entry.pinyin}]] /${entry.senses.join(`/`)}/`,
        );
      }

      histogram.set(senseCount, bucket);
    }

    const maxDigits = Math.max(
      1,
      ...[...histogram.keys()].map((senseCount) => String(senseCount).length),
    );

    const histogramBySenseCount = Object.fromEntries(
      [...histogram.entries()]
        .sort(([a], [b]) => a - b)
        .map(([senseCount, bucket]) => [
          String(senseCount).padStart(maxDigits, `0`),
          bucket,
        ]),
    );

    expect(histogramBySenseCount).toMatchInlineSnapshot(`
      {
        "02": {
          "count": 26158,
          "examples": [
            "3C 3C [[san1 C]] /computers, communications, and consumer electronics/China Compulsory Certificate (CCC)/",
            "95後 95后 [[jiu3wu3hou4]] /people born between 1995-01-01 and 1999-12-31/Gen Z (abbr. for 95後|95后[jiu3wu3hou4] + 00後|00后[ling2ling2hou4])/",
            "AB制 AB制 [[A B zhi4]] /to split the bill (where the male counterpart foots the larger portion of the sum)/(theater) a system where two actors take turns in acting the main role, with one actor replacing the other if either is unavailable/",
          ],
        },
        "03": {
          "count": 9458,
          "examples": [
            "B超 B超 [[B chao1]] /B-mode ultrasonography/prenatal ultrasound scan/abbr. for B型超聲|B型超声[B xing2chao1sheng1]/",
            "PA PA [[P A]] /public area attendant (tasked with cleaning the public areas of a hotel)/marketing assistant/sales assistant/",
            "P民 P民 [[P min2]] /(slang) shitizen/commoner/hoi polloi/",
          ],
        },
        "04": {
          "count": 3511,
          "examples": [
            "□ □ [[biang4]] /(Tw) (coll.) cool/awesome/(etymologically, a contracted form of 不一樣|不一样[bu4yi1yang4])/often written as ㄅㄧㄤˋ/",
            "ㄅㄧㄤˋ ㄅㄧㄤˋ [[xx5xx5xx5xx5]] /(Tw) (coll.) cool/awesome/pr. [biang4]/(etymologically, a contracted form of 不一樣|不一样[bu4yi1yang4])/",
            "一乾二淨 一干二净 [[yi1gan1'er4jing4]] /thoroughly (idiom)/completely/one and all/very clean/",
          ],
        },
        "05": {
          "count": 1404,
          "examples": [
            "PK PK [[P K]] /(slang) to take on/to challenge/to go head to head/showdown/comparison/",
            "㗂 㗂 [[sheng3]] /variant of 省[sheng3]/tight-lipped/to examine/to watch/to scour (esp. Cantonese)/",
            "一個蘿蔔一個坑 一个萝卜一个坑 [[yi1ge4luo2bo5yi1ge4keng1]] /lit. every turnip to its hole (idiom)/fig. each person has his own position/each to his own/horses for courses/every kettle has its lid/",
          ],
        },
        "06": {
          "count": 637,
          "examples": [
            "一套 一套 [[yi1tao4]] /suit/a set/a collection/of the same kind/the same old stuff/set pattern of behavior/",
            "一旦 一旦 [[yi1dan4]] /in case (sth happens)/if/once (sth happens, then...)/when/in a short time/in one day/",
            "一時 一时 [[yi1shi2]] /a period of time/a while/for a short while/temporary/momentary/at the same time/",
          ],
        },
        "07": {
          "count": 336,
          "examples": [
            "一般 一般 [[yi1ban1]] /same/ordinary/so-so/common/general/generally/in general/",
            "丁 丁 [[ding1]] /male adult/the 4th of the 10 Heavenly Stems 天干[tian1gan1]/fourth (used like "4" or "D")/small cube of meat or vegetable/(literary) to encounter/(archaic) ancient Chinese compass point: 195°/(chemistry) butyl/",
            "上邊 上边 [[shang4bian5]] /the top/above/overhead/upwards/the top margin/above-mentioned/those higher up/",
          ],
        },
        "08": {
          "count": 146,
          "examples": [
            "一頭 一头 [[yi1tou2]] /one head/a head full of sth/one end (of a stick)/one side/headlong/directly/rapidly/simultaneously/",
            "不是味兒 不是味儿 [[bu4shi4wei4r5]] /not the right flavor/not quite right/a bit off/fishy/queer/amiss/feel bad/be upset/",
            "不足 不足 [[bu4zu2]] /insufficient/lacking/deficiency/not enough/inadequate/not worth/cannot/should not/",
          ],
        },
        "09": {
          "count": 90,
          "examples": [
            "一世 一世 [[yi1shi4]] /generation/period of 30 years/one's whole lifetime/lifelong/age/era/times/the whole world/the First (of numbered European kings)/",
            "世 世 [[shi4]] /life/age/generation/era/world/lifetime/epoch/descendant/noble/",
            "並 并 [[bing4]] /and/furthermore/also/together with/(not) at all/simultaneously/to combine/to join/to merge/",
          ],
        },
        "10": {
          "count": 35,
          "examples": [
            "不含糊 不含糊 [[bu4han2hu5]] /unambiguous/unequivocal/explicit/prudent/cautious/not negligent/unafraid/unhesitating/really good/extraordinary/",
            "任 任 [[ren4]] /to assign/to appoint/to take up a post/office/responsibility/to let/to allow/to give free rein to/no matter (how, what etc)/classifier for terms served in office, or for spouses, girlfriends etc (as in 前任男友)/",
            "假借 假借 [[jia3jie4]] /to make use of/to use sth as pretext/under false pretenses/under the guise of/masquerading as/lenient/tolerant/loan character (one of the Six Methods 六書|六书 of forming Chinese characters)/character acquiring meanings by phonetic association/also called phonetic loan/",
          ],
        },
        "11": {
          "count": 31,
          "examples": [
            "下 下 [[xia4]] /down/downwards/below/lower/later/next (week etc)/second (of two parts)/to decline/to go down/to arrive at (a decision, conclusion etc)/measure word to show the frequency of an action/",
            "串 串 [[chuan4]] /to string together/to skewer/to connect wrongly/to gang up/to rove/string/bunch/skewer/classifier for things that are strung together, or in a bunch, or in a row: string of, bunch of, series of/to make a swift or abrupt linear movement (like a bead on an abacus)/to move across/",
            "亂 乱 [[luan4]] /in confusion or disorder/in a confused state of mind/disorder/upheaval/riot/illicit sexual relations/to throw into disorder/to mix up/indiscriminate/random/arbitrary/",
          ],
        },
        "12": {
          "count": 25,
          "examples": [
            "令 令 [[ling4]] /to order/to command/an order/warrant/writ/to cause/to make sth happen/virtuous/honorific title/season/government position (old)/type of short song or poem/",
            "凜 凛 [[lin3]] /cold/to shiver with cold/to tremble with fear/afraid/apprehensive/strict/stern/severe/austere/awe-inspiring/imposing/majestic/",
            "凡 凡 [[fan2]] /ordinary/commonplace/mundane/temporal/of the material world (as opposed to supernatural or immortal levels)/every/all/whatever/altogether/gist/outline/note of Chinese musical scale/",
          ],
        },
        "13": {
          "count": 10,
          "examples": [
            "具 具 [[ju4]] /tool/device/utensil/equipment/instrument/talent/ability/to possess/to have/to provide/to furnish/to state/classifier for devices, coffins, dead bodies/",
            "委 委 [[wei3]] /to entrust/to cast aside/to shift (blame etc)/to accumulate/roundabout/winding/dejected/listless/committee member/council/end/actually/certainly/",
            "幫 帮 [[bang1]] /to help/to assist/to support/for sb (i.e. as a help)/hired (as worker)/side (of pail, boat etc)/outer layer/upper (of a shoe)/group/gang/clique/party/secret society/",
          ],
        },
        "14": {
          "count": 8,
          "examples": [
            "包 包 [[bao1]] /to cover/to wrap/to hold/to include/to take charge of/to contract (to or for)/package/wrapper/container/bag/to hold or embrace/bundle/packet/CL:個|个[ge4],隻|只[zhi1]/",
            "去 去 [[qu4]] /to go/to go to (a place)/(of a time etc) last/just passed/to send/to remove/to get rid of/to reduce/to be apart from in space or time/to die (euphemism)/to play (a part)/(when used either before or after a verb) to go in order to do sth/(after a verb of motion indicates movement away from the speaker)/(used after certain verbs to indicate detachment or separation)/",
            "復 复 [[fu4]] /to go and return/to return/to resume/to return to a normal or original state/to repeat/again/to recover/to restore/to turn over/to reply/to answer/to reply to a letter/to retaliate/to carry out/",
          ],
        },
        "15": {
          "count": 9,
          "examples": [
            "勝 胜 [[sheng4]] /victory/success/to beat/to defeat/to surpass/victorious/superior to/to get the better of/better than/surpassing/superb (of vista)/beautiful (scenery)/wonderful (view)/(Taiwan pr. [sheng1]) able to bear/equal to (a task)/",
            "方 方 [[fang1]] /square/power or involution (math.)/upright/honest/fair and square/direction/side/party (to a contract, dispute etc)/place/method/prescription (medicine)/just when/only or just/classifier for square things/(abbr.) square or cubic meter/",
            "毛 毛 [[mao2]] /hair/feather/down/wool/mildew/mold/coarse or semifinished/young/raw/careless/unthinking/nervous/scared/(of currency) to devalue or depreciate/classifier for Chinese fractional monetary unit ( = 角[jiao3] , = one-tenth of a yuan or 10 fen 分[fen1])/",
          ],
        },
        "16": {
          "count": 2,
          "examples": [
            "套 套 [[tao4]] /to cover/to encase/cover/sheath/to overlap/to interleave/to model after/to copy/formula/harness/loop of rope/(fig.) to fish for/to obtain slyly/classifier for sets, collections/bend (of a river or mountain range, in place names)/tau (Greek letter Ττ)/",
            "當 当 [[dang1]] /to be/to act as/manage/withstand/when/during/ought/should/match equally/equal/same/obstruct/just at (a time or place)/on the spot/right/just at/",
          ],
        },
        "17": {
          "count": 3,
          "examples": [
            "帶 带 [[dai4]] /band/belt/girdle/ribbon/tire/area/zone/region/CL:條|条[tiao2]/to wear/to carry/to take along/to bear (i.e. to have)/to lead/to bring/to look after/to raise/",
            "掉 掉 [[diao4]] /to fall/to drop/to lag behind/to lose/to go missing/to reduce/fall (in prices)/to lose (value, weight etc)/to wag/to swing/to turn/to change/to exchange/to swap/to show off/to shed (hair)/(used after certain verbs to express completion, fulfillment, removal etc)/",
            "解 解 [[jie3]] /to divide/to break up/to split/to separate/to dissolve/to solve/to melt/to remove/to untie/to loosen/to open/to emancipate/to explain/to understand/to know/a solution/a dissection/",
          ],
        },
        "21": {
          "count": 1,
          "examples": [
            "白 白 [[bai2]] /white/snowy/pure/bright/empty/blank/plain/clear/to make clear/in vain/gratuitous/free of charge/reactionary/anti-communist/funeral/to stare coldly/to write wrong character/to state/to explain/vernacular/spoken lines in opera/",
          ],
        },
      }
    `);
  });
});

describe(`findCedictSenseById`, () => {
  test(`resolves senses by sense id`, async () => {
    const resolved = await findCedictSenseById(`一 一 [[yi1]] KmCz3`);
    expect(resolved).toEqual({
      id: `KmCz3`,
      sense: `one (also pr. [yao1])`,
      mergedIds: [],
    });
  });

  test(`returns null for unknown sense ids`, async () => {
    await expect(findCedictSenseById(`does|not|exist|nope`)).resolves.toBe(
      null,
    );
    await expect(findCedictSenseById(``)).resolves.toBe(null);
  });
});

describe(`extractDictionaryPinyinFromCedictSense`, () => {
  test(`resolves pinyin for known CE-DICT sense id`, async () => {
    const actual = await extractDictionaryPinyinFromCedictSense(
      `一 一 [[yi1]] KmCz3`,
    );

    expect(actual).toEqual([`yī`, `yāo`]);
  });

  test(`returns null for unknown CE-DICT sense id`, async () => {
    await expect(
      extractDictionaryPinyinFromCedictSense(`does|not|exist|nope`),
    ).resolves.toBeNull();
  });

  test(`includes only primary, unmarked, generic, and Beijing pronunciations`, async () => {
    const findCedictSenseById = vi
      .spyOn(cedictModule.mockable, `findCedictSenseById`)
      .mockResolvedValue({
        id: `AbCd1`,
        mergedIds: [],
        sense: `(also pr. [yao1]); (pr. [yi2]); (Beijing pr. [yi4]); (Taiwan pr. [yi1]); (colloquial pr. [yi3]); (old pr. [yi5]); (ancient pr. [yi2]); (Tai-lo pr. [i2])`,
      });

    const actual = await extractDictionaryPinyinFromCedictSense(
      `一 一 [[yi1]] AbCd1`,
    );

    expect(actual).toEqual([`yī`, `yāo`, `yí`, `yì`]);
    expect(findCedictSenseById).toHaveBeenCalledWith(`一 一 [[yi1]] AbCd1`);
  });

  test(`returns only primary pinyin when only excluded marker pronunciations are present`, async () => {
    vi.spyOn(cedictModule.mockable, `findCedictSenseById`).mockResolvedValue({
      id: `AbCd1`,
      mergedIds: [],
      sense: `(Taiwan pr. [yao1]); (colloquial pr. [yi3]); (old pr. [yi5]); (ancient pr. [yi2]); (Tai-lo pr. [i2])`,
    });

    const actual = await extractDictionaryPinyinFromCedictSense(
      `一 一 [[yi1]] AbCd1`,
    );

    expect(actual).toEqual([`yī`]);
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

describe(`buildSenseGroupingAffinityMatrix`, () => {
  test(`computes pairwise same-group affinity from sampled groupings`, () => {
    const result = buildSenseGroupingAffinityMatrix([
      [[`a`, `b`], [`c`]],
      [[`a`, `b`, `c`]],
      [[`a`], [`b`, `c`]],
    ]);

    expect(result.items).toEqual([`a`, `b`, `c`]);
    expect(result.matrix).toEqual([
      [1, 0.6667, 0.3333],
      [0.6667, 1, 0.6667],
      [0.3333, 0.6667, 1],
    ]);
  });

  test(`ignores samples where one item is missing for pair denominator`, () => {
    const result = buildSenseGroupingAffinityMatrix([
      [[`a`, `b`]],
      [[`a`], [`b`]],
      [[`a`]],
      [[`c`]],
    ]);

    expect(result.items).toEqual([`a`, `b`, `c`]);
    expect(result.matrix).toEqual([
      [1, 0.5, 0],
      [0.5, 1, 0],
      [0, 0, 1],
    ]);
  });

  test(`returns deterministic item ordering and valid matrix invariants`, () => {
    const result = buildSenseGroupingAffinityMatrix([
      [[`z`], [`a`, `m`]],
      [[`m`, `z`], [`a`]],
    ]);

    expect(result.items).toEqual([`a`, `m`, `z`]);
    expect(result.matrix).toHaveLength(result.items.length);

    for (let rowIndex = 0; rowIndex < result.matrix.length; rowIndex += 1) {
      const row = result.matrix[rowIndex];
      expect(row).toHaveLength(result.items.length);
      expect(row?.[rowIndex]).toBe(1);

      for (let colIndex = 0; colIndex < result.items.length; colIndex += 1) {
        const affinity = row?.[colIndex] ?? -1;
        expect(affinity).toBeGreaterThanOrEqual(0);
        expect(affinity).toBeLessThanOrEqual(1);
        expect(affinity).toBe(result.matrix[colIndex]?.[rowIndex]);
      }
    }
  });

  test(`handles duplicate glosses that appear in multiple groups within one sample`, () => {
    const result = buildSenseGroupingAffinityMatrix([
      [
        [`a`, `b`],
        [`b`, `c`],
      ],
      [[`a`], [`b`, `c`]],
    ]);

    expect(result.items).toEqual([`a`, `b`, `c`]);
    expect(result.matrix).toEqual([
      [1, 0.5, 0],
      [0.5, 1, 1],
      [0, 1, 1],
    ]);
  });

  test(`returns empty matrix for empty samples`, () => {
    const result = buildSenseGroupingAffinityMatrix([]);

    expect(result).toEqual({
      items: [],
      matrix: [],
    });
  });
});

describe(`buildSenseGlossOrderMatrix`, () => {
  test(`captures pairwise before counts for a single sample`, () => {
    const result = buildSenseGlossOrderMatrix([[[`a`, `b`, `c`]]]);

    expect(result.items).toEqual([`a`, `b`, `c`]);
    expect(result.matrix).toEqual([
      [0, 1, 1],
      [0, 0, 1],
      [0, 0, 0],
    ]);
  });

  test(`aggregates majority ordering across multiple samples`, () => {
    const result = buildSenseGlossOrderMatrix([
      [[`a`, `b`, `c`]],
      [[`a`, `b`, `c`]],
      [[`a`, `c`, `b`]],
    ]);

    expect(result.items).toEqual([`a`, `b`, `c`]);
    expect(result.matrix).toEqual([
      [0, 3, 3],
      [0, 0, 2],
      [0, 1, 0],
    ]);
  });

  test(`counts order evidence only when glosses are in the same sampled sense`, () => {
    const result = buildSenseGlossOrderMatrix([
      [[`a`], [`b`, `c`]],
      [[`a`, `b`], [`c`]],
    ]);

    expect(result.items).toEqual([`a`, `b`, `c`]);
    expect(result.matrix).toEqual([
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, 0],
    ]);
  });

  test(`returns empty matrix for empty samples`, () => {
    const result = buildSenseGlossOrderMatrix([]);

    expect(result).toEqual({
      items: [],
      matrix: [],
    });
  });
});

describe(`createGlossOrderSortComparator`, () => {
  test(`sorts by sampled majority order`, () => {
    const orderMatrix = buildSenseGlossOrderMatrix([
      [[`a`, `b`, `c`]],
      [[`a`, `b`, `c`]],
      [[`a`, `c`, `b`]],
    ]);
    const comparator = createGlossOrderSortComparator(orderMatrix);

    expect([`c`, `b`, `a`].sort(comparator)).toEqual([`a`, `b`, `c`]);
  });

  test(`uses fallback order for ties and cycles`, () => {
    const orderMatrix = buildSenseGlossOrderMatrix([
      [[`a`, `b`, `c`]],
      [[`b`, `c`, `a`]],
      [[`c`, `a`, `b`]],
    ]);
    const comparator = createGlossOrderSortComparator(orderMatrix, {
      fallbackOrder: [`b`, `a`, `c`],
    });

    expect([`a`, `c`, `b`].sort(comparator)).toEqual([`b`, `c`, `a`]);
  });

  test(`uses scope to rank within a cluster`, () => {
    const orderMatrix = buildSenseGlossOrderMatrix([
      [[`a`, `b`, `c`]],
      [[`a`, `b`, `c`]],
      [[`c`, `a`, `b`]],
    ]);
    const comparator = createGlossOrderSortComparator(orderMatrix, {
      scopeItems: [`a`, `c`],
      fallbackOrder: [`c`, `a`, `b`],
    });

    expect([`a`, `c`].sort(comparator)).toEqual([`a`, `c`]);
  });
});

describe(`clusterGlossesFromAffinityMatrix`, () => {
  test(`clusters glosses by complete-linkage affinity with threshold cut`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`, `c`],
        matrix: [
          [1, 0.9, 0.4],
          [0.9, 1, 0.8],
          [0.4, 0.8, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.clusters).toEqual([
      [`a`, `b`],
      [`b`, `c`],
    ]);
    expect(result.reviewGlosses).toEqual([]);
  });

  test(`uses complete linkage instead of chaining merges`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`, `c`],
        matrix: [
          [1, 0.9, 0.2],
          [0.9, 1, 0.9],
          [0.2, 0.9, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.clusters).toEqual([
      [`a`, `b`],
      [`b`, `c`],
    ]);
    expect(result.reviewGlosses).toEqual([]);
  });

  test(`duplicates an item into every cluster that meets the threshold`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`, `c`, `d`],
        matrix: [
          [1, 0.9, 0.2, 0.2],
          [0.9, 1, 0.8, 0.8],
          [0.2, 0.8, 1, 0.9],
          [0.2, 0.8, 0.9, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.clusters).toEqual([
      [`a`, `b`],
      [`c`, `d`, `b`],
    ]);
    expect(result.reviewGlosses).toEqual([]);
  });

  test(`sorts cluster items by strongest within-cluster affinity first`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`, `c`, `d`],
        matrix: [
          [1, 0.95, 0.1, 0.1],
          [0.95, 1, 0.9, 0.9],
          [0.1, 0.9, 1, 0.85],
          [0.1, 0.9, 0.85, 1],
        ],
      },
      { threshold: 0.05 },
    );

    expect(result.clusters).toEqual([[`b`, `c`, `d`, `a`]]);
    expect(result.reviewGlosses).toEqual([]);
  });

  test(`uses deterministic shorter-string tie break for equal strengths`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`bbb`, `a`, `cc`],
        matrix: [
          [1, 0.9, 0.9],
          [0.9, 1, 0.9],
          [0.9, 0.9, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.clusters).toEqual([[`a`, `cc`, `bbb`]]);
    expect(result.reviewGlosses).toEqual([]);
  });

  test(`merges when affinity equals threshold`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`],
        matrix: [
          [1, 0.6],
          [0.6, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.clusters).toEqual([[`a`, `b`]]);
    expect(result.reviewGlosses).toEqual([]);
  });

  test(`returns no merges when affinities are below threshold`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`, `c`],
        matrix: [
          [1, 0.59, 0.2],
          [0.59, 1, 0.59],
          [0.2, 0.59, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.clusters).toEqual([[`a`], [`b`], [`c`]]);
    expect(result.reviewGlosses).toEqual([
      { gloss: `a`, clusterAffinities: [1, 0.59, 0.2] },
      { gloss: `b`, clusterAffinities: [0.59, 1, 0.59] },
      { gloss: `c`, clusterAffinities: [0.2, 0.59, 1] },
    ]);
  });

  test(`throws when items contains duplicate gloss labels`, () => {
    expect(() =>
      clusterGlossesFromAffinityMatrix(
        {
          items: [`a`, `a`, `b`],
          matrix: [
            [1, 1, 0.2],
            [1, 1, 0.2],
            [0.2, 0.2, 1],
          ],
        },
        { threshold: 0.9 },
      ),
    ).toThrow(
      `affinity matrix items must be unique; found duplicates in 3 items`,
    );
  });

  test(`returns empty output for empty matrix`, () => {
    expect(
      clusterGlossesFromAffinityMatrix({
        items: [],
        matrix: [],
      }),
    ).toEqual({
      clusters: [],
      reviewGlosses: [],
    });
  });

  test(`does not include glosses in review list when affinities are only 0 or 1`, () => {
    const result = clusterGlossesFromAffinityMatrix(
      {
        items: [`a`, `b`, `c`],
        matrix: [
          [1, 1, 0],
          [1, 1, 0],
          [0, 0, 1],
        ],
      },
      { threshold: 0.6 },
    );

    expect(result.reviewGlosses).toEqual([]);
  });

  test(`throws for non-square matrix`, () => {
    expect(() =>
      clusterGlossesFromAffinityMatrix({
        items: [`a`, `b`],
        matrix: [[1, 0.7]],
      }),
    ).toThrow(`affinity matrix row count (1) must equal item count (2)`);

    expect(() =>
      clusterGlossesFromAffinityMatrix({
        items: [`a`, `b`],
        matrix: [[1, 0.7], [0.7]],
      }),
    ).toThrow(
      `affinity matrix must be square with each row length equal to item count (2)`,
    );
  });

  test(`throws for invalid threshold`, () => {
    expect(() =>
      clusterGlossesFromAffinityMatrix(
        {
          items: [`a`, `b`],
          matrix: [
            [1, 0.7],
            [0.7, 1],
          ],
        },
        { threshold: Number.NaN },
      ),
    ).toThrow(`cluster threshold must be a finite number between 0 and 1`);
  });
});

describe(`buildSenseGroupingEntryFromCedictEntry`, () => {
  test.for([
    // true likely over-split gloss-only senses
    [
      `服侍 服侍 [[fu2shi5]] /chief/head/elder/to grow/to develop/see also 后/to enhance/`,
      `服侍 服侍 [[fu2shi5]] /chief/head/elder/to grow/to develop/(see also 后)/to enhance/`,
    ],
  ] as const)(`$0`, ([inputLine, expectedLine]) => {
    const actual = buildSenseGroupingEntryFromCedictEntry(
      nonNullable(parseCedictV2Line(inputLine)),
    ).definition;
    const expected = nonNullable(parseCedictV2Line(expectedLine)).senses.map(
      (sense) => splitCedictV2Sense(sense),
    );

    expect(actual).toEqual(expected);
  });
});

describe(`cedict sense sampling cache`, () => {
  test(`preserves existing cached samples without topping up to sampleCount`, async () => {
    const entries = [
      parseCedictV2Line(`示例 示例 [[shi4li4]] /to run/quick movement/rush/`)!,
    ];
    const entryId = buildCedictV2EntryId({
      traditional: `示例`,
      simplified: `示例`,
      pinyin: `shi4li4` as PinyinNumericText,
    });
    const existingData = [
      {
        entryId,
        glosses: [`to run`, `quick movement`, `rush`],
        assignments: [[[0, 1], [2]]],
      },
    ];

    const requestSpy = vi.spyOn(aiModule, `requestOpenAiChatJson`);

    const sampling = await buildCedictSenseSampling(
      entries,
      [entryId],
      existingData,
      { sampleCount: 3 },
    );

    expect(sampling).toEqual(existingData);
    expect(requestSpy).not.toHaveBeenCalled();

    requestSpy.mockRestore();
  });

  test(`skips sampling entries with a single gloss`, async () => {
    const entries = [
      parseCedictV2Line(`示例 示例 [[shi4li4]] /single gloss only/`)!,
    ];

    const sampling = await buildCedictSenseSampling(
      entries,
      [
        buildCedictV2EntryId({
          traditional: `示例`,
          simplified: `示例`,
          pinyin: `shi4li4` as PinyinNumericText,
        }),
      ],
      [],
      { sampleCount: 2 },
    );

    expect(sampling).toEqual([]);
  });

  test(`skips sampling for entries with only one groupable text gloss`, async () => {
    const entries = [
      parseCedictV2Line(
        `示例 示例 [[shi4li4]] /to run/CL: 個|个[ge4]/see 后|后[hou4]/`,
      )!,
    ];

    const sampling = await buildCedictSenseSampling(
      entries,
      [
        buildCedictV2EntryId({
          traditional: `示例`,
          simplified: `示例`,
          pinyin: `shi4li4` as PinyinNumericText,
        }),
      ],
      [],
      { sampleCount: 2 },
    );

    expect(sampling).toEqual([]);
  });

  test(`encodes and decodes compact sampling rows`, () => {
    const decoded = decodeCedictSenseSamplingRow([
      `服侍 服侍 [[fu2shi5]]`,
      `also written 伏侍; see also 服事[fu2shi4]`,
      `/1;2/2;1/`,
    ]);

    expect(decoded).toEqual({
      entryId: `服侍 服侍 [[fu2shi5]]`,
      glosses: [`also written 伏侍`, `see also 服事[fu2shi4]`],
      assignments: [
        [
          [0, 1],
          [1, 0],
        ],
      ],
    });

    expect(encodeCedictSenseSamplingRow(decoded)).toEqual([
      `服侍 服侍 [[fu2shi5]]`,
      `also written 伏侍; see also 服事[fu2shi4]`,
      `/1;2/2;1/`,
    ]);
  });

  test(`clusters cached assignments into final groups`, () => {
    const parsed = parseCedictSenseSamplingText(
      JSON.stringify([
        [`示例 示例 [[shi4li4]]`, `a; b; c`, `/1;2/3/ /1;2/3/ /1;2/3/`],
      ]),
    );

    const clustered = clusterCedictSenseSamplingEntry(parsed[0]!, {
      threshold: 0.6,
    });

    expect(clustered.clusters).toEqual([[`a`, `b`], [`c`]]);
    expect(clustered.reviewGlosses).toEqual([]);
  });

  test(`orders glosses inside clustered senses by sampled majority order`, () => {
    const parsed = parseCedictSenseSamplingText(
      JSON.stringify([
        [
          `示例 示例 [[shi4li4]]`,
          `a; b; c`,
          `/1;2;3/ /1;2;3/ /1;3;2/ /1;2;3/ /1;2;3/ /1;3;2/ /1;3;2/ /1;3;2/ /1;2;3/ /1;2;3/`,
        ],
      ]),
    );

    const clustered = clusterCedictSenseSamplingEntry(parsed[0]!, {
      threshold: 0.01,
    });

    expect(clustered.clusters).toEqual([[`a`, `b`, `c`]]);
    expect(clustered.reviewGlosses).toEqual([]);
  });

  test(`builds grouped senses map from cached samples`, () => {
    const entries = [
      parseCedictV2Line(`示例 示例 [[shi4li4]] /to run/quick movement/rush/`)!,
    ];
    const parsed = parseCedictSenseSamplingText(
      JSON.stringify([
        [
          `示例 示例 [[shi4li4]]`,
          `to run; quick movement; rush`,
          `/1;2/3/ /1;2/3/ /1;2/3/`,
        ],
      ]),
    );

    const groupedEntries = buildCedictV2GroupedSensesFromSampling(
      entries,
      parsed,
      { threshold: 0.6 },
    );

    expect(groupedEntries[0]?.senses).toEqual([
      `to run; quick movement`,
      `rush`,
    ]);
  });

  test(`preserves non-text-only senses while regrouping text glosses`, () => {
    const entries = [
      parseCedictV2Line(
        `示例 示例 [[shi4li4]] /to run/quick movement/see 后|后[hou4]/`,
      )!,
    ];
    const parsed = parseCedictSenseSamplingText(
      JSON.stringify([
        [
          `示例 示例 [[shi4li4]]`,
          `to run; quick movement`,
          `/1;2/ /1;2/ /1;2/`,
        ],
      ]),
    );

    const groupedEntries = buildCedictV2GroupedSensesFromSampling(
      entries,
      parsed,
      { threshold: 0.6 },
    );

    expect(groupedEntries[0]?.senses).toEqual([
      `to run; quick movement`,
      `(see 后|后[hou4])`,
    ]);
  });
});

test.skipIf(isCi)(
  `write cedict .senseSampling cache`,
  { timeout: 5 * 60_000 },
  async () => {
    const entries = await loadCedictV2();
    let existingSampling = await loadCedictSenseSampling();

    const { hsk1 } = await groupCedictEntriesByHskLevel(entries);
    const targetEntryIds = hsk1
      .filter((entry) => isLikelyOverSplitCedictEntry(entry))
      .map((entry) => buildCedictV2EntryId(entry));

    for (const targetEntryId of targetEntryIds) {
      const nextSampling = await buildCedictSenseSampling(
        entries,
        [targetEntryId],
        existingSampling,
        { sampleCount: 10 },
      );

      const nextSamplingJson = serializeCedictSenseSamplingText(nextSampling);
      await writeJsonFileIfChanged(
        cedictSenseSamplingPath,
        nextSamplingJson,
        1,
      );
      existingSampling = nextSampling;
    }
  },
);

test(`.senseSampling.json has correct formatting`, async () => {
  await fmtJsonFile(cedictSenseSamplingPath, 1);
});

test(`write cedict .ids`, async () => {
  const entries = await loadCedictV2();
  const ids = await loadCedictV2Ids();
  const sampling = await loadCedictSenseSampling();
  const regroupedEntries = buildCedictV2GroupedSensesFromSampling(
    entries,
    sampling,
    { threshold: 0.6 },
  );
  const result = buildCedictV2SenseIdsText(regroupedEntries, ids);

  expect({
    deletedIds: result.stats.deletedIds,
    newIds: result.stats.newIds,
  }).toMatchObject({
    // Comment this out if you want to update the snapshot with new ids, but
    // normally we expect no changes to the ids if the entries haven't changed.
    deletedIds: [],
    // newIds: [],
  });

  await expect(result.text).toMatchFileSnapshot(cedictIdsPath);
});

test.skipIf(isCi)(
  `debug snapshots of cedict data with edits applied`,
  async () => {
    const entries = await loadCedictV2();

    // export the entire dataset
    await writeUtf8FileIfChanged(
      `${cedictPath}.debug.out`,
      serializeCedictV2Entries(entries, { debug: true }),
    );
    await writeUtf8FileIfChanged(
      `${cedictPath}.out`,
      serializeCedictV2Entries(entries),
    );

    // export just HSK slices
    const { hsk1, hsk2, hsk3, hsk4, hsk5, hsk6, hsk7 } =
      await groupCedictEntriesByHskLevel(entries);

    const sorter = mergeSortComparators<CedictV2EntryType>(
      sortComparatorString((x) => x.simplified),
      sortComparatorString((x) => x.pinyin),
      sortComparatorString((x) => x.traditional),
    );

    hsk1.sort(sorter);
    hsk2.sort(sorter);
    hsk3.sort(sorter);
    hsk4.sort(sorter);
    hsk5.sort(sorter);
    hsk6.sort(sorter);
    hsk7.sort(sorter);

    for (const [label, list] of [
      [`hsk1`, hsk1],
      [`hsk2`, hsk2],
      [`hsk3`, hsk3],
      [`hsk4`, hsk4],
      [`hsk5`, hsk5],
      [`hsk6`, hsk6],
      [`hsk7`, hsk7],
    ] as const) {
      await writeUtf8FileIfChanged(
        `${cedictPath}.${label}.out`,
        serializeCedictV2Entries(list),
      );
      await writeUtf8FileIfChanged(
        `${cedictPath}.${label}.debug.out`,
        serializeCedictV2Entries(list, { debug: true }),
      );
    }
  },
);
