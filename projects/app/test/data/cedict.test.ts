// pyly-not-src-test
import { describe, expect, test } from "vitest";
import {
    buildCedictSenseId,
    findCedictEntryById,
    findCedictSenseById,
    loadCedictV2,
    parseCedictV2Line,
    parseCedictV2Text,
    parseCedictId,
    transformCedictV2Entry,
} from "./cedict";

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
    const line = `外面 外面 [[wai4mian4]] /outside (also pr. [wai4 mian5] for this sense)/surface/exterior/`;
    const parsed = parseCedictV2Line(line);
    expect(parsed).not.toBeNull();

    const transformed = transformCedictV2Entry(parsed!);
    expect(transformed).toMatchInlineSnapshot(`
      [
        {
          "glosses": [
            "outside",
          ],
          "pinyin": [
            "wàimiàn",
            "wài mian",
          ],
          "pinyinNumeric": "wai4mian4",
          "senseId": "外面|外面|wai4mian4|outside (also pr. [wai4 mian5] for this sense)|1csvbac",
          "simplified": "外面",
          "traditional": "外面",
        },
        {
          "glosses": [
            "surface",
          ],
          "pinyin": [
            "wàimiàn",
            "wài mian",
          ],
          "pinyinNumeric": "wai4mian4",
          "senseId": "外面|外面|wai4mian4|surface|0717zzw",
          "simplified": "外面",
          "traditional": "外面",
        },
        {
          "glosses": [
            "exterior",
          ],
          "pinyin": [
            "wàimiàn",
            "wài mian",
          ],
          "pinyinNumeric": "wai4mian4",
          "senseId": "外面|外面|wai4mian4|exterior|1ubvrqb",
          "simplified": "外面",
          "traditional": "外面",
        },
      ]
    `);
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
