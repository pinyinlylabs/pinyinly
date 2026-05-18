// pyly-not-src-test
import { describe, expect, test } from "vitest";
import {
  applyCedictV2EditsToText,
  buildCedictSenseId,
  parseCedictV2EditsText,
  findCedictEntryById,
  findCedictSenseById,
  loadCedictV2,
  parseCedictV2Line,
  parseCedictV2Text,
  parseCedictId,
  transformCedictV2Entry,
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
          {
            "glosses": [
              "the emergency number for law enforcement in Mainland China and Taiwan",
            ],
          },
        ],
        "simplified": "110",
        "traditional": "110",
      }
    `);
  });

  test(`keeps standalone also-pr pronunciation senses in syntax parse`, () => {
    const line = `三更 三更 [[san1geng1]] /third of the five night watch periods 23:00-01:00 (old)/midnight/also pr. [san1 jin1]/`;

    const parsed = parseCedictV2Line(line);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "pinyin": "san1geng1",
        "senses": [
          {
            "glosses": [
              "third of the five night watch periods 23:00-01:00 (old)",
            ],
          },
          {
            "glosses": [
              "midnight",
            ],
          },
          {
            "glosses": [
              "also pr. [san1 jin1]",
            ],
          },
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
        {
          "glosses": [
            "to 3D print",
            "3D printing",
          ],
        },
        {
          "glosses": [
            "sense 2",
          ],
        },
        {
          "glosses": [
            "sense 3A",
            "sense 3B",
          ],
        },
      ]
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
        {
          "glosses": [
            "new sense 1",
          ],
        },
        {
          "glosses": [
            "old sense 2",
          ],
        },
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
        {
          "glosses": [
            "one",
          ],
        },
        {
          "glosses": [
            "two",
          ],
        },
        {
          "glosses": [
            "three",
          ],
        },
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
        {
          "glosses": [
            "old sense 2",
          ],
        },
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
        {
          "glosses": [
            "old sense 1",
          ],
        },
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
            "newSense": "new sense 1",
            "oldSense": "old sense 1",
          },
          {
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
      { oldSense: `one,two`, newSense: `one/two` },
    ]);
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

describe(`applyCedictV2EditsToText`, () => {
  test(`renders final cedict text with applied edits`, () => {
    const input = [
      `# comment`,
      `示例 示例 [[shi4li4]] /one,two/three/`,
      `小二 小二 [[xiao3'er4]] /old sense 1/old sense 2/`,
    ].join(`\n`);

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

    const output = applyCedictV2EditsToText(input, { strict: true, edits });
    expect(output).toMatchInlineSnapshot(`
      "# comment
      示例 示例 [[shi4li4]] /one/two/three/
      小二 小二 [[xiao3'er4]] /new sense 1/old sense 2/"
    `);
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
      parsed!.senses[0]?.glosses ?? [],
    );

    expect(senseId).toBe(`行|行|xing2|to walk|1t265rt`);
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
            "third of the five night watch periods 23:00-01:00 (old)",
          ],
          "pinyin": [
            "sāngēng",
            "sān jīn",
          ],
          "pinyinNumeric": "san1geng1",
          "senseId": "三更|三更|san1geng1|third of the five night watch periods 23:00-01:00 (old)|0mn8832",
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
          "senseId": "三更|三更|san1geng1|midnight|01l7toh",
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
    expect(transformed.map((x) => pick(x, [`classifiers`, `glosses`, `tags`])))
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
            "any activity that demands expertise, skill or experience (e.g. gathering forensic evidence, selecting clothing, managing relationships)",
          ],
          "tags": [
            "figurative",
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

describe(`transformCedictV2Entry tag extraction`, () => {
  test(`extracts idiom tag from gloss ending with (idiom)`, () => {
    const line = `應天承運 应天承运 [[ying4tian1cheng2yun4]] /lit. to respond to heaven and suit the times (idiom)/the Divine Right of kings/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "to respond to heaven and suit the times",
          ],
          "tags": [
            "literary",
            "idiom",
          ],
        },
        {
          "glosses": [
            "the Divine Right of kings",
          ],
        },
      ]
    `);
  });

  test(`extracts idiom tag from gloss starting with (idiom)`, () => {
    const line = `示例 示例 [[shi4li4]] /(idiom) used as a proverb; second gloss/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "used as a proverb",
            "second gloss",
          ],
          "tags": [
            "idiom",
          ],
        },
      ]
    `);
  });

  test(`extracts figurative tag from gloss starting with (fig.)`, () => {
    const line = `示例 示例 [[shi4li4]] /(fig.) used in a figurative sense/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "used in a figurative sense",
          ],
          "tags": [
            "figurative",
          ],
        },
      ]
    `);
  });

  test(`extracts literary tag from gloss starting with lit.`, () => {
    const line = `示例 示例 [[shi4li4]] /lit. to walk on clouds/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "to walk on clouds",
          ],
          "tags": [
            "literary",
          ],
        },
      ]
    `);
  });

  test(`does not extract literary tag when lit. appears at end of gloss`, () => {
    const line = `示例 示例 [[shi4li4]] /taken lit./`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "taken lit.",
          ],
        },
      ]
    `);
  });

  test(`accumulates tags from multiple glosses in text order`, () => {
    const line = `示例 示例 [[shi4li4]] /example (idiom); (fig.) figurative use/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "example",
            "figurative use",
          ],
          "tags": [
            "idiom",
            "figurative",
          ],
        },
      ]
    `);
  });

  test(`drops gloss that consists solely of a tag marker`, () => {
    const line = `示例 示例 [[shi4li4]] /normal gloss; (idiom)/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed.map((x) => pick(x, [`glosses`, `tags`])))
      .toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "normal gloss",
          ],
          "tags": [
            "idiom",
          ],
        },
      ]
    `);
  });
});

describe(`applyCedictV2EditsToText tag normalization`, () => {
  test(`moves tag from end of gloss to start in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /example text (idiom); more text/`;
    const output = applyCedictV2EditsToText(input);
    expect(output).toBe(
      `示例 示例 [[shi4li4]] /(idiom) example text; more text/`,
    );
  });

  test(`moves tag from middle of gloss to start in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /lit. to do something (idiom); to achieve a result/`;
    const output = applyCedictV2EditsToText(input);
    expect(output).toBe(
      `示例 示例 [[shi4li4]] /lit. (idiom) to do something; to achieve a result/`,
    );
  });

  test(`preserves gloss without tags unchanged`, () => {
    const input = `示例 示例 [[shi4li4]] /plain gloss/`;
    const output = applyCedictV2EditsToText(input);
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
    expect(firstSenseId).toContain(`行|行|xing2|`);
    expect(secondSenseId).toContain(`行|行|xing2|`);
  });

  test(`adds collision suffix to duplicate sense id bases`, () => {
    const [entry] = parseCedictV2Text(
      `行 行 [[xing2]] /to go;to walk/to go;to travel/`,
    );

    const transformed = transformCedictV2Entry(entry!);
    expect(transformed).toHaveLength(2);
    expect(transformed[0]?.senseId).toContain(`|to go|`);
    expect(transformed[1]?.senseId).toContain(`|to go|`);
    expect(transformed[0]?.senseId).not.toBe(transformed[1]?.senseId);
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
    const resolved = await findCedictEntryById(`一|一|yi1|one|abc123`);
    expect(resolved).toMatchObject({
      traditional: `一`,
      simplified: `一`,
      pinyin: `yi1`,
    });
  });

  test(`returns null for unknown ids`, async () => {
    await expect(
      findCedictEntryById(`不存在|不存在|bu4cun2zai4|nope`),
    ).resolves.toBeNull();
    await expect(
      findCedictEntryById(`does|not|exist|nope`),
    ).resolves.toBeNull();
    await expect(findCedictEntryById(`行|行|xing2`)).resolves.toBeNull();
    await expect(findCedictEntryById(``)).resolves.toBeNull();
  });
});

describe(`parseCedictId`, () => {
  test(`parses valid ids`, () => {
    const id = `一|一|yi1|one|abc123`;
    const parsed = parseCedictId(id);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "fingerprint": "abc123",
        "firstGloss": "one",
        "pinyin": "yi1",
        "simplified": "一",
        "traditional": "一",
      }
    `);
  });

  test(`parses valid id with | in the gloss`, () => {
    const id = `一|一|yi1|one ref 一|一[foo]|abc123`;
    const parsed = parseCedictId(id);
    expect(parsed).toMatchInlineSnapshot(`
      {
        "fingerprint": "abc123",
        "firstGloss": "one ref 一|一[foo]",
        "pinyin": "yi1",
        "simplified": "一",
        "traditional": "一",
      }
    `);
  });

  test(`returns null for invalid ids`, () => {
    expect(parseCedictId(`not a valid id`)).toBeNull();
    expect(parseCedictId(``)).toBeNull();
    expect(parseCedictId(`一|一|yi1|one`)).toBeNull();
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
