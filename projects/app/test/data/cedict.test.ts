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
  parseCedictSenseId,
  transformCedictV2Entry,
  serializeCedictV2Sense,
  parseCedictV2Sense,
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
            "third of the five night watch periods 23:00-01:00",
          ],
          "pinyin": [
            "sāngēng",
            "sān jīn",
          ],
          "pinyinNumeric": "san1geng1",
          "senseId": "三更 三更 [[san1geng1]] /third of the five night watch periods 23:00-01:00 (old)/",
          "simplified": "三更",
          "tags": [
            "old",
          ],
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
            "fig.",
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

describe(`parseCedictV2Line tag extraction`, () => {
  test.for([
    // suffix tag
    [`gloss (suffix)`, `{suffix} gloss`],
    // new domains
    [`(ACG) gloss`, `{D:ACG} gloss`],
    [`(accounting) gloss`, `{D:accounting} gloss`],
    [`(acoustics) gloss`, `{D:acoustics} gloss`],
    [`(acrobatics) gloss`, `{D:acrobatics} gloss`],
    [`(aerospace) gloss`, `{D:aerospace} gloss`],
    [`(agriculture) gloss`, `{D:agriculture} gloss`],
    [`(anatomy) gloss`, `{D:anatomy} gloss`],
    [`(angling) gloss`, `{D:angling} gloss`],
    [`(animals) gloss`, `{D:animals} gloss`],
    [`(archaeology) gloss`, `{D:archaeology} gloss`],
    [`(archeology) gloss`, `{D:archeology} gloss`],
    [`(archery) gloss`, `{D:archery} gloss`],
    [`(architecture) gloss`, `{D:architecture} gloss`],
    [`(astronautics) gloss`, `{D:astronautics} gloss`],
    [`(astronomy) gloss`, `{D:astronomy} gloss`],
    [`(athletics) gloss`, `{D:athletics} gloss`],
    [`(automotive) gloss`, `{D:automotive} gloss`],
    [`(aviation) gloss`, `{D:aviation} gloss`],
    [`(ballet) gloss`, `{D:ballet} gloss`],
    [`(banking) gloss`, `{D:banking} gloss`],
    [`(baseball) gloss`, `{D:baseball} gloss`],
    [`(basketball) gloss`, `{D:basketball} gloss`],
    [`(basketwork) gloss`, `{D:basketwork} gloss`],
    [`(BDSM) gloss`, `{D:BDSM} gloss`],
    [`(beer) gloss`, `{D:beer} gloss`],
    [`(biochemistry) gloss`, `{D:biochemistry} gloss`],
    [`(biogeography) gloss`, `{D:biogeography} gloss`],
    [`(biology) gloss`, `{D:biology} gloss`],
    [`(biotechnology) gloss`, `{D:biotechnology} gloss`],
    [`(bird) gloss`, `{D:bird} gloss`],
    [`(botany) gloss`, `{D:botany} gloss`],
    [`(boxing) gloss`, `{D:boxing} gloss`],
    [`(brand) gloss`, `{D:brand} gloss`],
    [`(broadcasting) gloss`, `{D:broadcasting} gloss`],
    [`(Buddhism) gloss`, `{D:Buddhism} gloss`],
    [`(Buddhist) gloss`, `{D:Buddhist} gloss`],
    [`(business) gloss`, `{D:business} gloss`],
    [`(calligraphy) gloss`, `{D:calligraphy} gloss`],
    [`(Cant.) gloss`, `{D:Cantonese} gloss`],
    [`(Cantonese) gloss`, `{D:Cantonese} gloss`],
    [`(cartography) gloss`, `{D:cartography} gloss`],
    [`(Catholicism) gloss`, `{D:Catholicism} gloss`],
    [`(chemical) gloss`, `{D:chemical} gloss`],
    [`(chemistry) gloss`, `{D:chemistry} gloss`],
    [`(Chinese) gloss`, `{D:Chinese} gloss`],
    [`(Christianity) gloss`, `{D:Christianity} gloss`],
    [`(cinema) gloss`, `{D:cinema} gloss`],
    [`(cinematography) gloss`, `{D:cinematography} gloss`],
    [`(commerce) gloss`, `{D:commerce} gloss`],
    [`(communications) gloss`, `{D:communications} gloss`],
    [`(computer) gloss`, `{D:computer} gloss`],
    [`(computing) gloss`, `{D:computing} gloss`],
    [`(Confucianism) gloss`, `{D:Confucianism} gloss`],
    [`(constellation) gloss`, `{D:constellation} gloss`],
    [`(cookery) gloss`, `{D:cookery} gloss`],
    [`(cooking) gloss`, `{D:cooking} gloss`],
    [`(cosmetics) gloss`, `{D:cosmetics} gloss`],
    [`(cryptography) gloss`, `{D:cryptography} gloss`],
    [`(cuisine) gloss`, `{D:cuisine} gloss`],
    [`(currency) gloss`, `{D:currency} gloss`],
    [`(Daoism) gloss`, `{D:Daoism} gloss`],
    [`(dating) gloss`, `{D:dating} gloss`],
    [`(deferential) gloss`, `{D:deferential} gloss`],
    [`(dentistry) gloss`, `{D:dentistry} gloss`],
    [`(dinosaur) gloss`, `{D:dinosaur} gloss`],
    [`(divination) gloss`, `{D:divination} gloss`],
    [`(diving) gloss`, `{D:diving} gloss`],
    [`(ecology) gloss`, `{D:ecology} gloss`],
    [`(economics) gloss`, `{D:economics} gloss`],
    [`(education) gloss`, `{D:education} gloss`],
    [`(electricity) gloss`, `{D:electricity} gloss`],
    [`(electromagnetism) gloss`, `{D:electromagnetism} gloss`],
    [`(electronics) gloss`, `{D:electronics} gloss`],
    [`(embryology) gloss`, `{D:embryology} gloss`],
    [`(engineering) gloss`, `{D:engineering} gloss`],
    [`(entomology) gloss`, `{D:entomology} gloss`],
    [`(epidemiology) gloss`, `{D:epidemiology} gloss`],
    [`(expletive) gloss`, `{D:expletive} gloss`],
    [`(fandom) gloss`, `{D:fandom} gloss`],
    [`(fashion) gloss`, `{D:fashion} gloss`],
    [`(fencing) gloss`, `{D:fencing} gloss`],
    [`(filmmaking) gloss`, `{D:filmmaking} gloss`],
    [`(finance) gloss`, `{D:finance} gloss`],
    [`(fitness) gloss`, `{D:fitness} gloss`],
    [`(flying) gloss`, `{D:flying} gloss`],
    [`(food) gloss`, `{D:food} gloss`],
    [`(football) gloss`, `{D:football} gloss`],
    [`(forestry) gloss`, `{D:forestry} gloss`],
    [`(gaming) gloss`, `{D:gaming} gloss`],
    [`(genetic) gloss`, `{D:genetic} gloss`],
    [`(genetics) gloss`, `{D:genetics} gloss`],
    [`(geography) gloss`, `{D:geography} gloss`],
    [`(geology) gloss`, `{D:geology} gloss`],
    [`(geometry) gloss`, `{D:geometry} gloss`],
    [`(geopolitics) gloss`, `{D:geopolitics} gloss`],
    [`(geotectonics) gloss`, `{D:geotectonics} gloss`],
    [`(golf) gloss`, `{D:golf} gloss`],
    [`(government) gloss`, `{D:government} gloss`],
    [`(grammar) gloss`, `{D:grammar} gloss`],
    [`(gymnastics) gloss`, `{D:gymnastics} gloss`],
    [`(hairstyle) gloss`, `{D:hairstyle} gloss`],
    [`(historical) gloss`, `{D:historical} gloss`],
    [`(HK) gloss`, `{D:HK} gloss`],
    [`(Hong Kong) gloss`, `{D:HK} gloss`],
    [`(horticulture) gloss`, `{D:horticulture} gloss`],
    [`(humor) gloss`, `{D:humor} gloss`],
    [`(humorous) gloss`, `{D:humor} gloss`],
    [`(hydrology) gloss`, `{D:hydrology} gloss`],
    [`(ichthyology) gloss`, `{D:ichthyology} gloss`],
    [`(immunology) gloss`, `{D:immunology} gloss`],
    [`(information) gloss`, `{D:information} gloss`],
    [`(Internet slang) gloss`, `{D:Internet slang} gloss`],
    [`(Islam) gloss`, `{D:Islam} gloss`],
    [`(Japan) gloss`, `{D:Japan} gloss`],
    [`(journalism) gloss`, `{D:journalism} gloss`],
    [`(law) gloss`, `{D:law} gloss`],
    [`(lexicography) gloss`, `{D:lexicography} gloss`],
    [`(linguistics) gloss`, `{D:linguistics} gloss`],
    [`(logistics) gloss`, `{D:logistics} gloss`],
    [`(mahjong) gloss`, `{D:mahjong} gloss`],
    [`(Malaysia) gloss`, `{D:Malaysia} gloss`],
    [`(mammology) gloss`, `{D:mammology} gloss`],
    [`(manufacturing) gloss`, `{D:manufacturing} gloss`],
    [`(Maoism) gloss`, `{D:Maoism} gloss`],
    [`(marketing) gloss`, `{D:marketing} gloss`],
    [`(math) gloss`, `{D:math.} gloss`],
    [`(math.) gloss`, `{D:math.} gloss`],
    [`(mathematical) gloss`, `{D:math.} gloss`],
    [`(measurement) gloss`, `{D:measurement} gloss`],
    [`(mechanics) gloss`, `{D:mechanics} gloss`],
    [`(med) gloss`, `{D:medical} gloss`],
    [`(med.) gloss`, `{D:medical} gloss`],
    [`(medical) gloss`, `{D:medical} gloss`],
    [`(medicine) gloss`, `{D:medical} gloss`],
    [`(metallurgy) gloss`, `{D:metallurgy} gloss`],
    [`(metalwork) gloss`, `{D:metalwork} gloss`],
    [`(meteorology) gloss`, `{D:meteorology} gloss`],
    [`(microbiology) gloss`, `{D:microbiology} gloss`],
    [`(military) gloss`, `{D:military} gloss`],
    [`(mineralogy) gloss`, `{D:mineralogy} gloss`],
    [`(mining) gloss`, `{D:mining} gloss`],
    [`(Mohism) gloss`, `{D:Mohism} gloss`],
    [`(music) gloss`, `{D:music} gloss`],
    [`(mycology) gloss`, `{D:mycology} gloss`],
    [`(mythology) gloss`, `{D:mythology} gloss`],
    [`(neologism) gloss`, `{D:neologism} gloss`],
    [`(neuroscience) gloss`, `{D:neuroscience} gloss`],
    [`(obstetrics) gloss`, `{D:obstetrics} gloss`],
    [`(oceanography) gloss`, `{D:oceanography} gloss`],
    [`(opera) gloss`, `{D:opera} gloss`],
    [`(optics) gloss`, `{D:optics} gloss`],
    [`(ornithology) gloss`, `{D:ornithology} gloss`],
    [`(orthodontics) gloss`, `{D:orthodontics} gloss`],
    [`(orthography) gloss`, `{D:orthography} gloss`],
    [`(painting) gloss`, `{D:painting} gloss`],
    [`(perfumery) gloss`, `{D:perfumery} gloss`],
    [`(petrochemistry) gloss`, `{D:petrochemistry} gloss`],
    [`(pharm.) gloss`, `{D:pharmacology} gloss`],
    [`(pharmacology) gloss`, `{D:pharmacology} gloss`],
    [`(philately) gloss`, `{D:philately} gloss`],
    [`(philosophy) gloss`, `{D:philosophy} gloss`],
    [`(phonetic) gloss`, `{D:phonetic} gloss`],
    [`(phonetics) gloss`, `{D:phonetics} gloss`],
    [`(phonology) gloss`, `{D:phonology} gloss`],
    [`(photography) gloss`, `{D:photography} gloss`],
    [`(physics) gloss`, `{D:physics} gloss`],
    [`(physiognomy) gloss`, `{D:physiognomy} gloss`],
    [`(physiology) gloss`, `{D:physiology} gloss`],
    [`(political) gloss`, `{D:politics} gloss`],
    [`(politically) gloss`, `{D:politics} gloss`],
    [`(politics) gloss`, `{D:politics} gloss`],
    [`(PRC) gloss`, `{D:PRC} gloss`],
    [`(printing) gloss`, `{D:printing} gloss`],
    [`(psychological) gloss`, `{D:psychological} gloss`],
    [`(psychology) gloss`, `{D:psychology} gloss`],
    [`(publishing) gloss`, `{D:publishing} gloss`],
    [`(radiography) gloss`, `{D:radiography} gloss`],
    [`(religion) gloss`, `{D:religion} gloss`],
    [`(religious) gloss`, `{D:religion} gloss`],
    [`(retail) gloss`, `{D:retail} gloss`],
    [`(retailer) gloss`, `{D:retailer} gloss`],
    [`(retailing) gloss`, `{D:retailing} gloss`],
    [`(rocketry) gloss`, `{D:rocketry} gloss`],
    [`(science) gloss`, `{D:science} gloss`],
    [`(seafood) gloss`, `{D:seafood} gloss`],
    [`(seismology) gloss`, `{D:seismology} gloss`],
    [`(semantics) gloss`, `{D:semantics} gloss`],
    [`(Shanghainese) gloss`, `{D:Shanghainese} gloss`],
    [`(Shinto) gloss`, `{D:Shinto} gloss`],
    [`(Singapore) gloss`, `{D:Singapore} gloss`],
    [`(soccer) gloss`, `{D:soccer} gloss`],
    [`(software) gloss`, `{D:software} gloss`],
    [`(sports) gloss`, `{D:sport} gloss`],
    [`(sport) gloss`, `{D:sport} gloss`],
    [`(stationery) gloss`, `{D:stationery} gloss`],
    [`(statistics) gloss`, `{D:statistics} gloss`],
    [`(surname) gloss`, `{D:surname} gloss`],
    [`(surveying) gloss`, `{D:surveying} gloss`],
    [`(Taiwan) gloss`, `{D:Taiwan} gloss`],
    [`(Taoism) gloss`, `{D:Taoism} gloss`],
    [`(TCM) gloss`, `{D:TCM} gloss`],
    [`(technology) gloss`, `{D:technology} gloss`],
    [`(telecommunications) gloss`, `{D:telecommunications} gloss`],
    [`(telephony) gloss`, `{D:telephony} gloss`],
    [`(textiles) gloss`, `{D:textiles} gloss`],
    [`(theater) gloss`, `{D:theater} gloss`],
    [`(thermodynamics) gloss`, `{D:thermodynamics} gloss`],
    [`(time) gloss`, `{D:time} gloss`],
    [`(transportation) gloss`, `{D:transportation} gloss`],
    [`(Tw) gloss`, `{D:Tw} gloss`],
    [`(typesetting) gloss`, `{D:typesetting} gloss`],
    [`(typography) gloss`, `{D:typography} gloss`],
    [`(vulgar) gloss`, `{D:vulgar} gloss`],
    [`(watchmaking) gloss`, `{D:watchmaking} gloss`],
    [`(weaving) gloss`, `{D:weaving} gloss`],
    [`(zoology) gloss`, `{D:zoology} gloss`],
    // non-domain tags
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
    // extracts multiple tags
    [
      `(biology) (loanword) to clone; a clone`,
      `{D:biology} {loanword} to clone; a clone`,
    ],
    // Accumulates tags from multiple glosses in text order
    [`gloss 1 (idiom); (fig.) gloss 2`, `{idiom} {fig.} gloss 1; gloss 2`],
    // Removes glosses that are solely tags
    [`normal gloss; (idiom)`, `{idiom} normal gloss`],
    // Unknown tags are left as-is
    [`(horse)`, `(horse)`],
  ] as [string, string][])(
    `tag fixture: %s → %s`,
    async ([input, expected]) => {
      const actual = serializeCedictV2Sense(parseCedictV2Sense(input));

      expect(actual).toBe(expected);
    },
  );
});

describe(`applyCedictV2EditsToText sense serialization`, () => {
  test(`preserves end marker gloss text in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /example text (idiom); more text/`;
    const output = applyCedictV2EditsToText(input);
    expect(output).toMatchInlineSnapshot(
      `"示例 示例 [[shi4li4]] /{idiom} example text; more text/"`,
    );
  });

  test(`preserves middle marker gloss text in .out output`, () => {
    const input = `示例 示例 [[shi4li4]] /lit. to do something (idiom); to achieve a result/`;
    const output = applyCedictV2EditsToText(input);
    expect(output).toMatchInlineSnapshot(
      `"示例 示例 [[shi4li4]] /{lit.} {idiom} to do something; to achieve a result/"`,
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
    const resolved = await findCedictEntryById(`一 一 [[yi1]] one`);
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
      findCedictEntryById(`不存在|不存在|bu4cun2zai4|nope`),
    ).resolves.toBeNull();
    await expect(
      findCedictEntryById(`does|not|exist|nope`),
    ).resolves.toBeNull();
    await expect(findCedictEntryById(`行|行|xing2`)).resolves.toBeNull();
    await expect(findCedictEntryById(``)).resolves.toBeNull();
  });
});

describe(`parseCedictSenseId`, () => {
  test(`parses valid ids`, () => {
    const id = `一 一 [[yi1]] one`;
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
    const id = `一 一 [[yi1]] one ref 一|一[foo]`;
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
