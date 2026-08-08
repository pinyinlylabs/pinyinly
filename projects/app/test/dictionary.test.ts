import {
  readDictionaryJson,
  unparseDictionaryJson,
  upsertHanziWordMeaning,
  writeDictionaryJson,
} from "#bin/util/dictionary.ts";
import { isHanziCharacter, splitHanziText } from "#data/hanzi.ts";
import type {
  HanziCharacter,
  HanziText,
  HanziWord,
  HanziIds,
  PinyinText,
  PinyinUnit,
} from "#data/model.ts";
import { isCi } from "#util/env.js";
import { PartOfSpeech } from "#data/model.ts";
import { pinyinUnitCount } from "#data/pinyin.js";
import { rPartOfSpeech } from "#data/rizzleSchema.js";
import type { DictionaryJson, HanziWordMeaning } from "#dictionary.ts";
import {
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  hanziFromHanziOrHanziWord,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  loadBuiltinCharacterDecompositionEntries,
  loadCharactersJson,
  loadDictionary,
  loadHanziWordMigrations,
  loadKangXiRadicalsStrokes,
  loadPinyinSoundNameSuggestions,
  loadPinyinSoundThemeDetails,
  loadPinyinWords,
  meaningKeyFromHanziWord,
  oneUnitPinyinListOrNull,
  oneUnitPinyinOrNull,
  parsePartOfSpeech,
  decomposeHanziToIdsLeafs,
} from "#dictionary.ts";
import {
  mapSetAdd,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import {
  invariant,
  nonNullable,
  uniqueInvariant,
} from "@pinyinly/lib/invariant";
import { describe, expect, test } from "vitest";
import {
  buildCedictSenseId,
  extractDictionaryPinyinFromCedictSense,
  findCedictSenseById,
  parseCedictSenseId,
} from "./data/cedict.ts";
import { 拼音, 汉, 汉字 } from "./data/helpers.ts";
import { dictionaryFilePath } from "#bin/util/paths.ts";
import isEqual from "lodash/isEqual";

test(`radical groups have the right number of elements`, async () => {
  // Data integrity test to ensure that the number of characters in each group
  // matches the expected range.
  const radicalsByStrokes = await loadKangXiRadicalsStrokes();
  for (const [, group] of radicalsByStrokes.entries()) {
    expect(
      group.characters.length === group.range[1] - group.range[0] + 1,
    ).toBe(true);
  }
});

test(`json data can be loaded and passes the schema validation`, async () => {
  await loadCharactersJson();
  await loadPinyinSoundNameSuggestions();
  await loadPinyinSoundThemeDetails();
  await loadPinyinWords();
  await loadDictionary();
});

test(`hanzi word meaning schema accepts optional freq`, () => {
  const parsed = hanziWordMeaningSchema.parse({
    gloss: [`long`],
    pinyin: [`cháng`],
    freq: 0.8,
  });

  expect(parsed.freq).toBe(0.8);
});

test(`hanzi word meaning schema allows missing freq`, () => {
  const parsed = hanziWordMeaningSchema.parse({
    gloss: [`long`],
    pinyin: [`cháng`],
  });

  expect(parsed.freq).toBeUndefined();
});

test(`hanzi word meaning schema accepts optional cedict reference`, () => {
  const parsed = hanziWordMeaningSchema.parse({
    gloss: [`one`],
    pinyin: [`yī`],
    cedict: `一 一 [[yi1]] KmCz3`,
  });

  expect(parsed.cedict).toBe(`一 一 [[yi1]] KmCz3`);
});

test(`hanzi word meaning schema accepts cedict reference when gloss contains a pipe`, () => {
  const parsed = hanziWordMeaningSchema.parse({
    gloss: [`variant`],
    pinyin: [`xuán`],
    cedict: `㻽 㻽 [[xuan2]] yz3yp`,
  });

  expect(parsed.cedict).toBe(`㻽 㻽 [[xuan2]] yz3yp`);
});

test(`dictionary CE-DICT references resolve to existing CE-DICT senses`, async () => {
  const dict = await readDictionaryJson();
  const migratedHanziWords: string[] = [];

  for (const [hanziWord, meaning] of dict.entries()) {
    if (meaning.cedict == null) {
      continue;
    }

    const resolvedSense = await findCedictSenseById(meaning.cedict);
    expect
      .soft(
        resolvedSense,
        `hanziWord: ${hanziWord}, senseId: ${meaning.cedict}`,
      )
      .not.toBeNull();

    if (resolvedSense == null) {
      continue;
    }

    const parsedSenseId = nonNullable(parseCedictSenseId(meaning.cedict));
    const canonicalSenseId = buildCedictSenseId(
      parsedSenseId.traditional,
      parsedSenseId.simplified,
      parsedSenseId.pinyin,
      resolvedSense.id,
    );

    if (meaning.cedict !== canonicalSenseId) {
      meaning.cedict = canonicalSenseId;
      migratedHanziWords.push(hanziWord);
    }
  }

  if (migratedHanziWords.length > 0) {
    await expect(unparseDictionaryJson(dict)).toMatchJsonFileSnapshot(
      dictionaryFilePath,
    );
  }
});

test(`hanzi word meaning schema enforces normalized freq bounds`, () => {
  expect(() =>
    hanziWordMeaningSchema.parse({
      gloss: [`long`],
      pinyin: [`cháng`],
      freq: -0.1,
    }),
  ).toThrow();

  expect(() =>
    hanziWordMeaningSchema.parse({
      gloss: [`long`],
      pinyin: [`cháng`],
      freq: 1.1,
    }),
  ).toThrow();
});

test(`hanzi word meaning-keys are not too similar`, async () => {
  const dict = await loadDictionary();

  const hanziToMeaningKey = new Map<string, string[]>();

  // Group by hanzi, and keep a sorted array of meaning-keys.
  for (const hanziWord of dict.allHanziWords) {
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

  const violations: string[] = [];

  // no meaning-key is just a prefix of a sibling meaning-key
  for (const [hanzi, meaningKeys] of hanziToMeaningKey) {
    for (let i = 0; i < meaningKeys.length - 1; i++) {
      for (let j = i + 1; j < meaningKeys.length; j++) {
        const a = meaningKeys[i];
        const b = meaningKeys[j];
        invariant(a != null && b != null);

        if (b.startsWith(a)) {
          violations.push(`${hanzi}:${a} + ${hanzi}:${b}`);
        }
      }
    }
  }

  expect(violations, `meanings that are too similar`).toMatchInlineSnapshot(`
    [
      "松:loose + 松:loosen",
      "治疗:treat + 治疗:treatment",
    ]
  `);
});

test(`hanzi word meaning-key lint`, async () => {
  const dict = await loadDictionary();

  const isViolating = (x: string) =>
    // no "measure word" or "radical"
    /measure ?word| radical/iu.exec(x) != null ||
    // only allow english alphabet
    !/^[a-zA-Z]+$/u.test(x);

  const violations = new Set(
    dict.allHanziWords.filter((hanziWord) =>
      isViolating(meaningKeyFromHanziWord(hanziWord)),
    ),
  );

  expect(violations).toEqual(new Set());
});

test(`hanzi word meaning pinyin lint`, async () => {
  const dict = await loadDictionary();
  const multiplePinyin = [];

  for (const [hanziWord, meaning] of dict.allEntries) {
    if (meaning.pinyin != null && meaning.pinyin.length > 1) {
      multiplePinyin.push(hanziWord);
    }
  }

  expect(multiplePinyin, `hanzi words with multiple pinyin`)
    .toMatchInlineSnapshot(`
      [
        "一:one",
        "外面:outside",
        "夭:dieYoung",
        "花:flower",
        "谁:who",
      ]
    `);
});

test(`hanzi word meaning gloss lint`, async () => {
  const dict = await loadDictionary();

  for (const [hanziWord, meaning] of dict.allEntries) {
    // Rules for all glosses
    for (const gloss of meaning.gloss) {
      const label = `${hanziWord} gloss "${gloss}"`;

      // Symbols
      expect.soft(gloss, `${label} commas`).not.toMatch(/,/u);
      expect.soft(gloss, `${label} semicolons`).not.toMatch(/;/u);
      // TODO: re-enable these later
      // expect.soft(gloss, `${label} parenthesis`).not.toMatch(/\(/);

      // No banned words
      expect
        .soft(gloss, `${label} banned words`)
        .not.toMatch(/measure ?word|radical|particle/iu);
    }

    // Rules for the primary gloss
    {
      const gloss = nonNullable(meaning.gloss[0]);
      const label = `${hanziWord} gloss "${gloss}"`;

      const maxWords = 5;
      expect
        .soft(gloss.match(/[^\s]+/gu)?.length ?? 0, `${label} word count`)
        .toBeLessThanOrEqual(maxWords);
    }

    // Glosses are unique
    expect
      .soft(() => {
        uniqueInvariant(meaning.gloss);
      }, hanziWord)
      .not.toThrow();
  }
});

test(`hanzi meaning canonicalForm`, async () => {
  const charactersJson = await loadCharactersJson();
  const dictionary = await loadDictionary();

  for (const [hanzi, data] of charactersJson) {
    if (data.canonicalForm != null) {
      // A character with a `canonicalForm` shouldn't exist in the dictionary.
      expect
        .soft(
          dictionary.lookupHanzi(hanzi),
          `${hanzi} is not the canonical form and shouldn't have a dictionary entry`,
        )
        .toEqual([]);

      // The character pointed to by `canonicalForm` *SHOULD* be in the dictionary.
      expect
        .soft(
          dictionary.lookupHanzi(data.canonicalForm),
          `${hanzi} canonical form should exist`,
        )
        .not.toEqual([]);
    }
  }
});

test(`hanzi word meaning pinyin lint`, async () => {
  const dict = await loadDictionary();

  // `pinyin` key should be omitted rather than an empty
  for (const [hanziWord, { pinyin }] of dict.allEntries) {
    expect
      .soft(
        pinyin?.length,
        `${hanziWord} pinyin key should be omitted rather than an empty array;`,
      )
      .not.toBe(0);
  }

  // Multiple pinyin entries should have the same number of units
  for (const [hanziWord, { pinyin }] of dict.allEntries) {
    const unitCounts = pinyin?.map((p) => pinyinUnitCount(p)) ?? [];
    expect.soft(new Set(unitCounts).size, hanziWord).not.toBeGreaterThan(1);
  }
});

test(
  `dictionary pinyin matches CE-DICT pinyin usage`,
  { retry: isCi ? 0 : 1 },
  async () => {
    const dict = await readDictionaryJson();

    const mismatches: string[] = [];

    for (const [hanziWord, meaning] of dict.entries()) {
      if (meaning.cedict == null) {
        continue;
      }

      const expectedPinyin = await extractDictionaryPinyinFromCedictSense(
        meaning.cedict,
      );
      if (expectedPinyin == null) {
        // assertion thrown in another test, so just skip this case here to avoid noise
        continue;
      }

      const pinyinMatches = isEqual(meaning.pinyin, expectedPinyin);

      if (!pinyinMatches) {
        mismatches.push(hanziWord);
        meaning.pinyin = expectedPinyin;
      }
    }

    if (mismatches.length > 0 && !isCi) {
      await writeDictionaryJson(dict);
    }

    expect(mismatches).toEqual([]);
  },
);

test(`hanzi words are unique on (primary gloss, primary pinyin)`, async () => {
  const dict = await loadDictionary();
  const isComponentFormHanzi = await getIsComponentFormHanzi();

  const byGlossAndPinyin = new Map<string, Set<HanziWord>>();
  for (const [hanziWord, { gloss, pinyin }] of dict.allEntries) {
    const primaryGloss = nonNullable(gloss[0]);
    const meaningKey = meaningKeyFromHanziWord(hanziWord);
    // special case allow "radical" to have overlaps
    if (meaningKey === `radical`) {
      // TODO: delete this, instead delete the item from the dictionary.
      continue;
    }
    // allow component-form of hanzi to have overlaps
    const hanzi = hanziFromHanziWord(hanziWord);
    if (isHanziCharacter(hanzi) && isComponentFormHanzi(hanzi)) {
      // TODO: delete this, instead delete the item from the dictionary.
      continue;
    }
    const primaryPinyin = pinyin?.[0];
    const key = `${primaryGloss}:${primaryPinyin ?? `<nullish>`}`;
    mapSetAdd(byGlossAndPinyin, key, hanziWord);
  }

  // Make sure that there is only one hanzi word for each meaning key and
  // pinyin, but do it in a way to give a helpful error message.
  const duplicates = [...byGlossAndPinyin.values()].filter((x) => x.size > 1);

  // Check that there are no duplicates (except for the exceptions).
  expect(duplicates).toMatchInlineSnapshot(`
    [
      Set {
        "㐅:five",
        "五:five",
      },
      Set {
        "他们:they",
        "她们:they",
        "它们:they",
      },
      Set {
        "冫:ice",
        "冰:ice",
      },
      Set {
        "底:bottom",
        "氐:bottom",
      },
      Set {
        "斗:fight",
        "鬥:struggle",
      },
    ]
  `);
});

test(`hanzi words are unique on (hanzi, part-of-speech, pinyin)`, async () => {
  const dict = await loadDictionary();

  const byHanziAndPinyin = new Map<string, Set<string>>();
  for (const [hanziWord, { pos, pinyin }] of dict.allEntries) {
    const hanzi = hanziFromHanziWord(hanziWord);
    const key = `${hanzi}:${pos}:${pinyin}`;
    const set = byHanziAndPinyin.get(key) ?? new Set();
    set.add(hanziWord);
    byHanziAndPinyin.set(key, set);
  }

  // Make sure that there is only one hanzi word for each hanzi and
  // pinyin, but do it in a way to give a helpful error message.
  const duplicates = [...byHanziAndPinyin.values()].filter((x) => x.size > 1);

  // Check that there are no duplicates (except for the exceptions).
  expect(duplicates).toMatchInlineSnapshot(`
    [
      Set {
        "乚:hidden",
        "乚:second",
      },
      Set {
        "从来:always",
        "从来:never",
      },
      Set {
        "块:currency",
        "块:pieces",
      },
      Set {
        "天:day",
        "天:sky",
      },
      Set {
        "家:family",
        "家:home",
      },
      Set {
        "局:game",
        "局:office",
      },
      Set {
        "折:discount",
        "折:fold",
      },
      Set {
        "提:carry",
        "提:mention",
      },
      Set {
        "究竟:exactly",
        "究竟:ultimately",
      },
      Set {
        "米:meter",
        "米:rice",
      },
      Set {
        "菜:dish",
        "菜:vegetable",
      },
      Set {
        "行:okay",
        "行:walk",
      },
      Set {
        "表:surface",
        "表:watch",
      },
      Set {
        "要:must",
        "要:want",
      },
      Set {
        "面:face",
        "面:surface",
      },
      Set {
        "高潮:climax",
        "高潮:tide",
      },
    ]
  `);
});

test(`all word lists only reference valid hanzi words`, async () => {
  const dict = await loadDictionary();

  const wordList = [
    ...dict.hsk1HanziWords,
    ...dict.hsk2HanziWords,
    ...dict.hsk3HanziWords,
    ...dict.hsk4HanziWords,
    ...dict.hsk5HanziWords,
    ...dict.hsk6HanziWords,
    ...dict.hsk7To9HanziWords,
  ];

  for (const hanziWord of wordList) {
    if (dict.lookupHanziWord(hanziWord) === null) {
      throw new Error(
        `missing hanzi word lookup for ${hanziWord} in word list`,
      );
    }
  }
});

test(`hanzi uses consistent unicode characters`, async () => {
  const debugNonCjkUnifiedIdeograph = await loadDebugNonCjkUnifiedIdeograph();
  const dict = await loadDictionary();
  const charactersJson = await loadCharactersJson();

  const violations = dict.allHanziWords
    .map((x) => hanziFromHanziWord(x))
    .flatMap((x) => splitHanziText(x))
    .filter((x) => charactersJson.get(x)?.isStructural !== true)
    .filter((x) => isNotCjkUnifiedIdeograph(x))
    .map((x) => debugNonCjkUnifiedIdeograph(x));

  expect(violations, `found non-CJK unified ideographs`).toMatchInlineSnapshot(
    `[]`,
  );
});

describe(
  `loadHanziWordMigrations suite` satisfies HasNameOf<
    typeof loadHanziWordMigrations
  >,
  async () => {
    test(`no "from" keys are in the dictionary`, async () => {
      const hanziWordRenames = await loadHanziWordMigrations();
      const dictionary = await loadDictionary();
      for (const [oldHanziWord] of hanziWordRenames) {
        expect
          .soft(
            dictionary.lookupHanziWord(oldHanziWord),
            `${oldHanziWord} should not be in the dictionary`,
          )
          .toBeNull();
      }
    });

    test(`all "to" keys are in the dictionary`, async () => {
      const hanziWordRenames = await loadHanziWordMigrations();
      const dictionary = await loadDictionary();
      for (const [, newHanziWord] of hanziWordRenames) {
        if (newHanziWord != null) {
          expect
            .soft(
              dictionary.lookupHanziWord(newHanziWord),
              `${newHanziWord} should be in the dictionary`,
            )
            .not.toBeNull();
        }
      }
    });

    test(`no "to" keys are also "from" keys (could cause loops)`, async () => {
      const hanziWordRenames = await loadHanziWordMigrations();
      expect
        .soft(
          [...hanziWordRenames].filter(
            ([, newHanziWord]) =>
              newHanziWord != null && hanziWordRenames.has(newHanziWord),
          ),
        )
        .toEqual([]);
    });
  },
);

test(`dictionary contains entries for decomposition`, async () => {
  const unknownCharacters = new Map<
    HanziCharacter,
    /* sources */ Set<HanziCharacter>
  >();
  const unknownComponents = new Map<
    HanziCharacter,
    /* sources */ Set<HanziCharacter>
  >();
  const dictionary = await loadDictionary();
  const charactersJson = await loadCharactersJson();
  const decompositionData = await loadBuiltinCharacterDecompositionEntries();

  const allHanzi = dictionary.allHanziWords.map((hanziWord) =>
    hanziFromHanziWord(hanziWord),
  );

  for (const hanzi of allHanzi) {
    for (const character of splitHanziText(hanzi)) {
      const meanings = dictionary.lookupHanzi(character);
      if (meanings.length === 0) {
        mapSetAdd(unknownCharacters, character, hanzi);
      }

      for (const component of decomposeHanziToIdsLeafs(
        character,
        decompositionData,
        isHanziCharacter,
      )) {
        if (charactersJson.get(component)?.canonicalForm != null) {
          // The character is a pointer to another character, so it itself
          // doesn't need a dictionary entry.
          continue;
        }

        const lookup = dictionary.lookupHanzi(component);
        if (lookup.length === 0) {
          mapSetAdd(unknownComponents, component, character);
        }
      }
    }
  }

  // There's not much value in learning components that are only used once, so
  // we only test that there are dictionary entries for components that are used
  // multiple times.
  const actualMissing = new Map<
    HanziCharacter,
    /* sources */ Set<HanziCharacter>
  >();

  for (const [character, sources] of unknownCharacters) {
    for (const source of sources) {
      mapSetAdd(actualMissing, character, source);
    }
  }
  for (const [component, sources] of unknownComponents) {
    for (const source of sources) {
      mapSetAdd(actualMissing, component, source);
    }
  }

  const hsk1Hanzi = new Set(
    dictionary.hsk1HanziWords.map((hanziWord) => hanziFromHanziWord(hanziWord)),
  );
  const hsk2Hanzi = new Set(
    dictionary.hsk2HanziWords.map((hanziWord) => hanziFromHanziWord(hanziWord)),
  );
  const hsk3Hanzi = new Set(
    dictionary.hsk3HanziWords.map((hanziWord) => hanziFromHanziWord(hanziWord)),
  );
  const hsk4Hanzi = new Set(
    dictionary.hsk4HanziWords.map((hanziWord) => hanziFromHanziWord(hanziWord)),
  );
  const hsk5Hanzi = new Set(
    dictionary.hsk5HanziWords.map((hanziWord) => hanziFromHanziWord(hanziWord)),
  );
  const hsk6Hanzi = new Set(
    dictionary.hsk6HanziWords.map((hanziWord) => hanziFromHanziWord(hanziWord)),
  );
  const hsk7To9Hanzi = new Set(
    dictionary.hsk7To9HanziWords.map((hanziWord) =>
      hanziFromHanziWord(hanziWord),
    ),
  );

  function hskLabel(hanzi: HanziText): string {
    return hsk1Hanzi.has(hanzi)
      ? `[HSK1]`
      : hsk2Hanzi.has(hanzi)
        ? `[HSK2]`
        : hsk3Hanzi.has(hanzi)
          ? `[HSK3]`
          : hsk4Hanzi.has(hanzi)
            ? `[HSK4]`
            : hsk5Hanzi.has(hanzi)
              ? `[HSK5]`
              : hsk6Hanzi.has(hanzi)
                ? `[HSK6]`
                : hsk7To9Hanzi.has(hanzi)
                  ? `[HSK7-9]`
                  : ``;
  }

  function prettify(map: typeof unknownCharacters): string[] {
    return [...map]
      .map(
        ([char, sources]) =>
          `${char} via ${[...sources]
            .sort()
            .map((char) => char + hskLabel(char))
            .join(`, `)}`,
      )
      .sort();
  }

  expect(prettify(actualMissing)).toMatchInlineSnapshot(`
    [
      "⺀ via 买[HSK1], 冬, 卖[HSK2], 图[HSK3], 头[HSK2], 实, 尽, 疼[HSK2], 终, 续, 读[HSK1]",
      "⺄ via 九[HSK1], 势, 杂, 热[HSK1], 熟[HSK2]",
      "⺆ via 周[HSK2], 察, 然, 调[HSK3]",
      "⺈ via 争[HSK3], 你[HSK1], 像[HSK2], 免, 净, 危, 吹[HSK2], 嘴[HSK2], 急[HSK2], 您[HSK1], 换[HSK2], 晚[HSK1], 欠, 次[HSK1], 欢, 歌[HSK1], 确, 称[HSK2], 绝, 色[HSK4], 角[HSK2], 解, 象, 负, 资, 静[HSK3], 饣, 饭[HSK1], 饱[HSK2], 饺, 饿[HSK1], 馆, 鱼[HSK2]",
      "⺧ via 先[HSK1], 告, 洗[HSK1], 选[HSK2], 造[HSK3], 靠[HSK2]",
      "⺳ via 深[HSK3]",
      "⺶ via 养[HSK2]",
      "⺺ via 康, 隶",
      "⺼ via 察, 然",
      "〢 via 坚, 篮, 紧[HSK3], 蓝[HSK2]",
      "コ via 争[HSK3], 事[HSK1], 假[HSK2], 健, 净, 建[HSK3], 彐, 当[HSK2], 录[HSK3], 急[HSK2], 糖[HSK3], 绿[HSK2], 群[HSK3], 聿, 臼, 裙, 雪[HSK2], 静[HSK3], 鼠",
      "ス via 经, 轻[HSK2]",
      "ュ via 候, 决, 块[HSK1], 夬, 年[HSK1], 快[HSK1], 敢[HSK3], 筷, 缺[HSK3]",
      "㇀ via 七[HSK1], 东[HSK1], 切[HSK4], 毛[HSK1], 笔[HSK2], 虍, 裤, 车[HSK1], 转[HSK3], 轻[HSK2], 较[HSK3], 辆[HSK2], 输[HSK3], 连[HSK3]",
      "㇂ via 民",
      "㇇ via 今, 原, 念[HSK3], 愿, 水[HSK1], 永, 泉, 泳",
      "㇉ via 丂, 号[HSK1], 巧[HSK3], 考[HSK1]",
      "㇖ via 楚, 疋, 蛋[HSK2]",
      "㐄 via 舛, 舞",
      "㐫 via 离[HSK2], 脑",
      "㐬 via 流[HSK2]",
      "㔾 via 创, 危, 碗[HSK2], 范, 顾",
      "㕣 via 商",
      "㝵 via 得[HSK2]",
      "㠯 via 官[HSK4], 管[HSK3], 追[HSK3], 馆",
      "㡀 via 黹",
      "䏍 via 能[HSK1]",
      "丄 via 功, 工, 左[HSK1], 巧[HSK3], 差[HSK1], 式, 恐, 空[HSK3], 红[HSK2], 经, 试[HSK1], 轻[HSK2], 靑",
      "丅 via 功, 听[HSK1], 工, 左[HSK1], 巧[HSK3], 差[HSK1], 式, 恐, 所[HSK3], 斤[HSK2], 断[HSK3], 新[HSK1], 空[HSK3], 红[HSK2], 经, 诉, 试[HSK1], 轻[HSK2], 近[HSK2], 鬲",
      "丆 via 团[HSK3], 才[HSK2], 材, 烦[HSK4], 石, 破[HSK3], 础, 确, 碗[HSK2], 碰[HSK2], 面[HSK2], 页[HSK1], 顺, 须, 顾, 顿[HSK3], 预, 领[HSK3], 题[HSK2], 颜",
      "丈 via 丈, 丈夫[HSK4]",
      "丌 via 鼻",
      "专 via 专, 专业[HSK3], 专家[HSK3], 专心[HSK4], 专门[HSK3], 专题[HSK3], 传[HSK3], 转[HSK3]",
      "丙 via 病[HSK1]",
      "並 via 普, 碰[HSK2]",
      "丩 via 叫[HSK1], 收[HSK2]",
      "丬 via 将, 状, 装[HSK2]",
      "临 via 临, 临时[HSK4], 光临[HSK4], 面临[HSK4]",
      "丷 via 䒑, 产, 亲[HSK3], 位[HSK2], 关[HSK1], 养[HSK2], 判, 前[HSK1], 半[HSK1], 单[HSK4], 商, 善, 喜, 境, 墙[HSK2], 增, 差[HSK1], 平[HSK2], 并[HSK3], 康, 弟[HSK1], 录[HSK3], 总[HSK3], 意, 拉[HSK2], 接[HSK2], 播, 救[HSK3], 数[HSK2], 断[HSK3], 新[HSK1], 旁, 普, 曾[HSK4], 来[HSK1], 样, 楼[HSK1], 氺, 求[HSK2], 球[HSK1], 瓶[HSK2], 着[HSK1], 短[HSK2], 碰[HSK2], 立[HSK5], 站[HSK1], 竟, 章, 米[HSK2], 类[HSK3], 精, 糖[HSK3], 继, 绿[HSK2], 羊[HSK3], 美[HSK3], 群[HSK3], 联, 胖[HSK3], 苹, 评, 说[HSK1], 豆, 辛, 迷[HSK3], 送[HSK1], 道[HSK2], 部[HSK3], 釆, 金[HSK3], 隶, 雨[HSK1], 雪[HSK2], 零[HSK1], 需, 音, 颜, 首[HSK4], 鬲, 黍, 黹, 鼓",
      "丸 via 势, 热[HSK1], 熟[HSK2]",
      "乀 via 乂, 义, 交[HSK2], 使[HSK3], 便, 做[HSK1], 原, 史, 展, 愿, 攵, 收[HSK2], 改[HSK2], 放[HSK1], 故, 效, 救[HSK3], 教[HSK1], 敢[HSK3], 散[HSK4], 数[HSK2], 整[HSK3], 文, 更[HSK2], 校, 水[HSK1], 永, 泉, 泳, 济, 父, 爷, 爸[HSK1], 爻, 警, 议, 较[HSK3], 这[HSK1], 饺, 齐[HSK3]",
      "乁 via 气[HSK2], 汽",
      "乇 via 毛[HSK1], 笔[HSK2]",
      "之 via 之, 之一[HSK4], 之前[HSK4], 之后[HSK4], 之间[HSK4], 分之[HSK4], 总之[HSK4]",
      "乎 via 不在乎[HSK4], 乎, 似乎[HSK4], 几乎[HSK4], 在乎[HSK4]",
      "乔 via 桥[HSK3]",
      "乛 via 买[HSK1], 了[HSK1], 卖[HSK2], 好[HSK1], 子[HSK1], 字[HSK1], 存[HSK3], 学[HSK1], 孩, 教[HSK1], 敢[HSK3], 李, 游[HSK3], 熟[HSK2], 矛, 续, 舒, 读[HSK1], 预",
      "乞 via 吃[HSK1]",
      "亇 via 竹",
      "予 via 舒, 预",
      "亍 via 行[HSK1], 街[HSK2]",
      "亘 via 宣",
      "亚 via 亚, 亚运会[HSK4], 普, 碰[HSK2]",
      "亦 via 变[HSK2]",
      "享 via 熟[HSK2]",
      "亭 via 停[HSK2]",
      "亽 via 今, 令, 冷[HSK1], 念[HSK3], 零[HSK1], 领[HSK3]",
      "亾 via 喝[HSK1], 渴[HSK1]",
      "仌 via 肉[HSK1]",
      "仑 via 论",
      "仓 via 创",
      "企 via 企, 企业[HSK4]",
      "伴 via 伙伴[HSK4], 伴",
      "余 via 业余[HSK4], 余, 其余[HSK4], 除",
      "供 via 供, 供应[HSK4], 提供[HSK4]",
      "依 via 依, 依然[HSK4], 依靠[HSK4]",
      "促 via 促, 促使[HSK4], 促进[HSK4], 促销[HSK4]",
      "俗 via 俗, 风俗[HSK4]",
      "俞 via 输[HSK3]",
      "偿 via 偿, 补偿",
      "允 via 充",
      "兆 via 跳[HSK3]",
      "兑 via 说[HSK1]",
      "兰 via 善, 差[HSK1], 样, 着[HSK1], 羊[HSK3], 群[HSK3]",
      "冃 via 冒",
      "円 via 靑",
      "冈 via 刚[HSK2]",
      "冉 via 再[HSK1]",
      "冋 via 向[HSK2], 响[HSK2], 高[HSK1]",
      "冏 via 商",
      "凡 via 恐, 赢[HSK3]",
      "凶 via 离[HSK2], 脑",
      "刍 via 急[HSK2]",
      "刖 via 前[HSK1], 输[HSK3]",
      "则 via 则, 原则[HSK4], 否则[HSK4], 规则[HSK4]",
      "劲 via 使劲[HSK4], 劲, 有劲儿[HSK4]",
      "勇 via 勇, 勇敢[HSK4], 勇气[HSK4], 英勇[HSK4]",
      "勺 via 的[HSK1], 约[HSK3], 药[HSK2]",
      "匃 via 喝[HSK1], 渴[HSK1]",
      "卄 via 借[HSK2], 共[HSK4], 其, 基, 媒, 展, 散[HSK4], 昔, 期[HSK3], 某[HSK3], 甘, 甜[HSK3], 睡[HSK1], 错[HSK1], 黄[HSK2], 龷",
      "卅 via 带[HSK2]",
      "卌 via 舞",
      "卑 via 啤, 牌[HSK4]",
      "博 via 博, 博士, 博客, 博物馆, 博览会",
      "卬 via 迎",
      "即 via 即, 即将[HSK4], 立即[HSK4]",
      "厃 via 危",
      "厄 via 顾",
      "厘 via 厘, 厘米[HSK4]",
      "叔 via 叔, 叔叔[HSK4]",
      "叚 via 假[HSK2]",
      "叩 via 命",
      "召 via 召, 召开[HSK4], 照[HSK3], 绍, 超",
      "史 via 使[HSK3], 历史[HSK4], 史",
      "叶 via 叶, 叶子[HSK4], 树叶[HSK4], 茶叶[HSK4]",
      "吂 via 赢[HSK3]",
      "吉 via 结[HSK4]",
      "吏 via 使[HSK3]",
      "吕 via 营",
      "君 via 群[HSK3], 裙",
      "吴 via 误",
      "吾 via 语",
      "呆 via 保[HSK3]",
      "呈 via 程",
      "呼 via 呼, 呼吸[HSK4], 招呼[HSK4]",
      "咅 via 部[HSK3]",
      "唐 via 糖[HSK3]",
      "售 via 出售[HSK4], 售, 售货员[HSK4], 销售[HSK4]",
      "啬 via 墙[HSK2]",
      "喿 via 澡",
      "囬 via 面[HSK2]",
      "固 via 固, 固定[HSK4], 坚固[HSK4]",
      "圡 via 压[HSK3]",
      "圣 via 怪[HSK4]",
      "圾 via 圾, 垃圾[HSK4]",
      "址 via 地址[HSK4], 址, 网址[HSK4]",
      "均 via 均, 平均[HSK4]",
      "垂 via 睡[HSK1]",
      "垃 via 垃, 垃圾[HSK4]",
      "培 via 培, 培养[HSK4], 培育[HSK4], 培训[HSK4], 培训班[HSK4]",
      "塑 via 塑, 塑料[HSK4], 塑料袋[HSK4]",
      "壬 via 任[HSK3], 庭, 挺[HSK2]",
      "壮 via 装[HSK2]",
      "壴 via 喜, 鼓",
      "夗 via 碗[HSK2]",
      "央 via 换[HSK2], 英",
      "奂 via 换[HSK2]",
      "奋 via 兴奋[HSK4], 奋, 奋斗[HSK4]",
      "奴 via 努",
      "妇 via 夫妇[HSK4], 妇",
      "妻 via 夫妻[HSK4], 妻, 妻子[HSK4]",
      "妾 via 接[HSK2]",
      "姨 via 姨, 阿姨[HSK4]",
      "娄 via 数[HSK2], 楼[HSK1]",
      "婆 via 婆, 老婆[HSK4]",
      "孙 via 孙, 孙女[HSK4], 孙子[HSK4]",
      "孝 via 教[HSK1]",
      "孰 via 熟[HSK2]",
      "宁 via 宁, 宁静[HSK4]",
      "宛 via 碗[HSK2]",
      "宾 via 宾, 宾馆",
      "寅 via 演[HSK3]",
      "寒 via 寒, 寒假[HSK4], 寒冷[HSK4]",
      "寻 via 寻, 寻找[HSK4]",
      "射 via 谢",
      "尔 via 你[HSK1], 您[HSK1], 称[HSK2]",
      "尚 via 尚, 高尚[HSK4]",
      "尹 via 群[HSK3], 裙",
      "尼 via 呢[HSK1]",
      "尾 via 尾, 尾巴[HSK4]",
      "居 via 剧, 居, 居住[HSK4], 居民[HSK4], 据",
      "屯 via 顿[HSK3]",
      "岸 via 岸, 岸上",
      "川 via 带[HSK2], 训, 顺",
      "巨 via 巨, 巨大[HSK4]",
      "巩 via 恐",
      "帀 via 师",
      "席 via 主席[HSK4], 出席[HSK4], 席",
      "帽 via 帽, 帽子[HSK4]",
      "幕 via 幕, 闭幕, 闭幕式",
      "幼 via 幼, 幼儿园[HSK4]",
      "庄 via 脏[HSK2]",
      "序 via 序, 程序[HSK4], 顺序[HSK4]",
      "库 via 裤",
      "府 via 府, 政府[HSK4]",
      "延 via 延, 延期[HSK4], 延续[HSK4], 延长[HSK4]",
      "廷 via 庭, 挺[HSK2]",
      "廿 via 世, 度[HSK2], 革, 鞋[HSK2]",
      "弔 via 弟[HSK1], 第[HSK1]",
      "弗 via 费[HSK3]",
      "彑 via 互",
      "彦 via 颜",
      "彻 via 彻, 彻底[HSK4]",
      "彼 via 彼, 彼此",
      "征 via 征, 征服[HSK4], 征求[HSK4], 特征[HSK4]",
      "律 via 一律[HSK4], 律, 律师[HSK4], 法律[HSK4], 纪律[HSK4], 规律[HSK4]",
      "微 via 微, 微信[HSK4], 微笑[HSK4]",
      "怀 via 怀, 怀念[HSK4], 怀疑[HSK4]",
      "怨 via 怨, 抱怨",
      "恶 via 恶, 恶心[HSK4]",
      "悲 via 悲, 悲伤, 悲剧",
      "惊 via 吃惊[HSK4], 惊",
      "慰 via 安慰, 慰",
      "戉 via 越[HSK2]",
      "戊 via 咸[HSK4], 喊[HSK2], 城[HSK3], 感, 成[HSK2]",
      "战 via 战, 战争[HSK4], 战士[HSK4], 战斗[HSK4], 战胜[HSK4], 挑战[HSK4]",
      "戶 via 所[HSK3]",
      "扁 via 篇[HSK2], 遍[HSK2]",
      "执 via 势, 热[HSK1]",
      "扩 via 扩, 扩大[HSK4], 扩展[HSK4]",
      "扬 via 扬, 表扬[HSK4]",
      "扮 via 扮, 扮演",
      "承 via 承, 承受[HSK4], 承担[HSK4], 承认[HSK4]",
      "担 via 承担[HSK4], 担, 担任[HSK4], 担保[HSK4], 担心[HSK4], 负担[HSK4]",
      "招 via 招, 招呼[HSK4]",
      "拜 via 拜, 拜访",
      "择 via 择, 选择[HSK4]",
      "括 via 包括[HSK4], 括, 括号[HSK4], 概括[HSK4]",
      "挥 via 发挥[HSK4], 指挥[HSK4], 挥",
      "捡 via 捡, 捡便宜",
      "授 via 授, 教授[HSK4]",
      "措 via 措, 措施[HSK4]",
      "描 via 描, 描写[HSK4], 描述[HSK4]",
      "摩 via 按摩, 摩",
      "操 via 体操[HSK4], 操, 操作[HSK4], 操场[HSK4]",
      "政 via 政, 政府[HSK4], 政治[HSK4]",
      "敌 via 敌, 敌人[HSK4]",
      "敕 via 整[HSK3]",
      "敬 via 警",
      "料 via 原料[HSK4], 塑料[HSK4], 塑料袋[HSK4], 料, 材料[HSK4], 燃料[HSK4], 资料[HSK4]",
      "斥 via 诉",
      "施 via 实施[HSK4], 措施[HSK4], 施, 设施[HSK4]",
      "斿 via 游[HSK3]",
      "旡 via 既[HSK4], 概",
      "旨 via 指[HSK3]",
      "昌 via 唱[HSK1]",
      "昏 via 婚",
      "映 via 反映[HSK4], 映",
      "昭 via 照[HSK3]",
      "昷 via 温",
      "智 via 智, 智力[HSK4], 智能[HSK4]",
      "暑 via 暑, 暑假[HSK4]",
      "曷 via 喝[HSK1], 渴[HSK1]",
      "权 via 权, 权利[HSK4]",
      "杲 via 桌",
      "构 via 机构[HSK4], 构, 构成[HSK4], 构造[HSK4], 结构[HSK4]",
      "林 via 林, 树林[HSK4], 楚, 麻",
      "案 via 图案[HSK4], 方案[HSK4], 案, 答案[HSK4]",
      "梯 via 梯, 楼梯[HSK4], 电梯[HSK4]",
      "植 via 植, 植物[HSK4], 种植[HSK4]",
      "椰 via 椰, 椰子",
      "模 via 大规模[HSK4], 模, 模型[HSK4], 模特儿[HSK4], 规模[HSK4]",
      "歺 via 餐",
      "殊 via 殊, 特殊[HSK4]",
      "毌 via 惯",
      "毒 via 毒, 病毒",
      "毕 via 毕, 毕业[HSK4], 毕业生[HSK4], 毕竟",
      "毫 via 毫, 毫升[HSK4], 毫米[HSK4]",
      "氾 via 范",
      "泉 via 原, 愿, 泉, 矿泉水[HSK4]",
      "洛 via 落[HSK4]",
      "渐 via 渐, 渐渐[HSK4], 逐渐[HSK4]",
      "源 via 来源[HSK4], 源, 电源[HSK4], 资源[HSK4]",
      "激 via 刺激[HSK4], 激, 激动[HSK4], 激烈[HSK4]",
      "炎 via 谈[HSK3]",
      "炼 via 炼, 锻炼[HSK4]",
      "焦 via 蕉",
      "燃 via 燃, 燃料[HSK4], 燃烧[HSK4]",
      "爰 via 暖",
      "爷 via 大爷[HSK4], 爷, 爷爷[HSK1]",
      "独 via 单独[HSK4], 独, 独特[HSK4], 独立[HSK4], 独自[HSK4]",
      "率 via 效率[HSK4], 汇率[HSK4], 率, 率先[HSK4]",
      "玨 via 班[HSK1]",
      "玻 via 玻, 玻璃",
      "璃 via 玻璃, 璃",
      "甚 via 甚, 甚至[HSK4]",
      "甬 via 痛[HSK3], 通[HSK2]",
      "甲 via 单[HSK4], 懂[HSK2], 理, 里[HSK1], 重[HSK1], 量[HSK4]",
      "申 via 申, 申请[HSK4], 神",
      "甶 via 鬼",
      "畀 via 鼻",
      "番 via 播",
      "疑 via 怀疑[HSK4], 疑, 疑问[HSK4]",
      "疗 via 医疗[HSK4], 治疗[HSK4], 疗, 疗养[HSK4]",
      "益 via 利益[HSK4], 收益[HSK4], 益",
      "监 via 篮, 蓝[HSK2]",
      "矿 via 矿, 矿泉水[HSK4]",
      "码 via 号码[HSK4], 密码[HSK4], 数码[HSK4], 码",
      "研 via 研, 研制[HSK4], 研究[HSK4], 研究生[HSK4]",
      "祭 via 察",
      "禁 via 禁, 禁止[HSK4]",
      "禹 via 属[HSK3]",
      "秀 via 优秀[HSK4], 秀",
      "秘 via 神秘[HSK4], 秘, 秘书[HSK4], 秘密[HSK4]",
      "究 via 研究[HSK4], 研究生[HSK4], 究, 究竟[HSK4], 讲究[HSK4]",
      "窗 via 窗, 窗台[HSK4], 窗子[HSK4], 窗户[HSK4]",
      "竟 via 境, 毕竟, 究竟[HSK4], 竟, 竟然[HSK4]",
      "童 via 儿童[HSK4], 童, 童年[HSK4], 童话[HSK4]",
      "符 via 符, 符号[HSK4], 符合[HSK4]",
      "粮 via 粮, 粮食[HSK4]",
      "纷 via 纷, 纷纷[HSK4]",
      "络 via 络, 网络[HSK4]",
      "统 via 传统[HSK4], 总统[HSK4], 系统[HSK4], 统, 统一[HSK4], 统计[HSK4]",
      "维 via 维, 维修[HSK4], 维护[HSK4], 维持[HSK4]",
      "综 via 综, 综合[HSK4]",
      "缓 via 缓, 缓解[HSK4]",
      "缩 via 缩, 缩小[HSK4], 缩短[HSK4]",
      "罒 via 慢[HSK1], 曼",
      "罙 via 深[HSK3]",
      "置 via 位置[HSK4], 安置[HSK4], 布置[HSK4], 置, 装置[HSK4], 设置[HSK4]",
      "聊 via 无聊[HSK4], 聊",
      "肀 via 健, 建[HSK3], 糖[HSK3], 聿",
      "肖 via 消",
      "肚 via 肚, 肚子[HSK4]",
      "肰 via 然",
      "胡 via 湖[HSK2]",
      "胸 via 胸, 胸部[HSK4]",
      "腐 via 腐, 豆腐[HSK4]",
      "致 via 一致[HSK4], 导致[HSK4], 细致[HSK4], 致",
      "舍 via 舒",
      "航 via 航, 航班[HSK4], 航空[HSK4]",
      "苗 via 猫[HSK2]",
      "苟 via 警",
      "苹 via 苹, 苹果[HSK3]",
      "著 via 显著[HSK4], 著, 著作[HSK4], 著名[HSK4]",
      "董 via 懂[HSK2]",
      "虑 via 考虑[HSK4], 虑",
      "袜 via 袜, 袜子[HSK4]",
      "裹 via 包裹[HSK4], 裹",
      "覀 via 漂, 票[HSK1], 要[HSK1], 鹿",
      "览 via 博览会, 览",
      "觜 via 嘴[HSK2]",
      "译 via 翻译[HSK4], 译",
      "诚 via 诚, 诚信[HSK4], 诚实[HSK4]",
      "谓 via 无所谓[HSK4], 谓",
      "财 via 财, 财产[HSK4], 财富[HSK4]",
      "质 via 品质[HSK4], 性质[HSK4], 质, 质量[HSK4]",
      "购 via 购, 购买[HSK4], 购物[HSK4]",
      "贯 via 惯",
      "赞 via 称赞[HSK4], 赞, 赞助[HSK4], 赞成[HSK4], 赞赏[HSK4]",
      "趋 via 趋, 趋势[HSK4]",
      "趣 via 乐趣[HSK4], 兴趣[HSK4], 感兴趣[HSK4], 有趣[HSK4], 趣",
      "距 via 距, 距离[HSK4]",
      "载 via 下载[HSK4], 记载[HSK4], 载",
      "辑 via 编辑, 辑",
      "辩 via 辩, 辩论[HSK4]",
      "迅 via 迅, 迅速[HSK4]",
      "迟 via 推迟[HSK4], 迟, 迟到[HSK4]",
      "迫 via 被迫[HSK4], 迫, 迫切[HSK4]",
      "述 via 描述[HSK4], 述",
      "迶 via 随[HSK3]",
      "逐 via 逐, 逐步[HSK4], 逐渐[HSK4]",
      "递 via 快递[HSK4], 递",
      "途 via 前途[HSK4], 用途[HSK4], 途, 途中[HSK4], 长途[HSK4]",
      "遗 via 遗, 遗产[HSK4], 遗传[HSK4]",
      "邦 via 帮[HSK1]",
      "郎 via 新郎[HSK4], 郎",
      "释 via 解释[HSK4], 释",
      "销 via 促销[HSK4], 推销[HSK4], 销, 销售[HSK4]",
      "锻 via 锻, 锻炼[HSK4]",
      "镜 via 眼镜[HSK4], 镜, 镜头[HSK4], 镜子[HSK4]",
      "镸 via 套[HSK2], 髟",
      "闭 via 倒闭[HSK4], 关闭[HSK4], 封闭[HSK4], 闭, 闭幕, 闭幕式",
      "阅 via 阅, 阅读[HSK4]",
      "阶 via 台阶[HSK4], 阶, 阶段[HSK4]",
      "阻 via 阻, 阻止[HSK4]",
      "阿 via 啊[HSK2], 阿, 阿姨[HSK4]",
      "附 via 附, 附近[HSK4]",
      "陆 via 大陆[HSK4], 陆, 陆地[HSK4], 陆续[HSK4]",
      "限 via 无限[HSK4], 有限[HSK4], 期限[HSK4], 限, 限制[HSK4]",
      "雷 via 打雷[HSK4], 雷",
      "默 via 沉默[HSK4], 默, 默默[HSK4]",
      "龰 via 定[HSK4], 提[HSK2], 是[HSK1], 楚, 疋, 蛋[HSK2], 走[HSK1], 赶[HSK3], 起[HSK1], 超, 越[HSK2], 足, 题[HSK2]",
      "龱 via 卤",
      "龴 via 令, 冷[HSK1], 痛[HSK3], 矛, 舒, 通[HSK2], 零[HSK1], 预, 领[HSK3]",
      "龵 via 看[HSK1]",
      "龸 via 堂, 学[HSK1], 常[HSK1], 觉",
      "𠀎 via 赛",
      "𠀐 via 贵[HSK1]",
      "𠁤 via 西[HSK1]",
      "𠂈 via 亥, 刻[HSK2], 孩, 该[HSK2]",
      "𠂋 via 后[HSK1]",
      "𠂢 via 派[HSK3]",
      "𠂤 via 追[HSK3]",
      "𠂭 via 鬯",
      "𠃊 via 亡, 喝[HSK1], 忘[HSK1], 忙[HSK1], 断[HSK3], 望, 渴[HSK1], 继, 赢[HSK3]",
      "𠃋 via 亥, 刻[HSK2], 孩, 该[HSK2]",
      "𠃓 via 场[HSK2], 汤[HSK3]",
      "𠃜 via 声",
      "𠄌 via 展",
      "𠄎 via 乃, 仍[HSK3], 奶[HSK1]",
      "𠄐 via 矛, 舒, 预",
      "𠕁 via 篇[HSK2], 遍[HSK2], 龠",
      "𠕒 via 雨[HSK1], 雪[HSK2], 零[HSK1], 需",
      "𠚍 via 鬯",
      "𠚕 via 齒",
      "𠤎 via 化[HSK3], 华, 花[HSK1]",
      "𠦝 via 朝[HSK3]",
      "𠫓 via 流[HSK2], 育",
      "𠫔 via 倒[HSK2], 到[HSK1], 套[HSK2], 室[HSK3], 屋, 握, 至, 髟",
      "𠬝 via 报[HSK3], 服",
      "𠮛 via 司, 同, 咸[HSK4], 喊[HSK2], 喜, 富[HSK3], 感, 畐, 短[HSK2], 福[HSK3], 词[HSK2], 豆, 鬲, 鼓",
      "𠮦 via 总[HSK3]",
      "𠮷 via 周[HSK2], 调[HSK3]",
      "𠱠 via 龠",
      "𡨄 via 赛",
      "𡳾 via 顿[HSK3]",
      "𡿨 via 巛",
      "𢀖 via 经, 轻[HSK2]",
      "𢆉 via 南[HSK1], 幸",
      "𢎨 via 弟[HSK1], 第[HSK1]",
      "𣥂 via 步[HSK3]",
      "𣦼 via 餐",
      "𤴓 via 定[HSK4], 提[HSK2], 是[HSK1], 题[HSK2]",
      "𦉫 via 而[HSK4], 需",
      "𦍌 via 养[HSK2], 美[HSK3]",
      "𦓐 via 而[HSK4], 需",
      "𦣻 via 夏",
      "𧰨 via 像[HSK2], 家[HSK1], 豕, 象",
      "𨈑 via 谢, 身",
      "𪧷 via 将",
      "𫝀 via 五[HSK1], 语",
      "𫠠 via 代[HSK3], 划[HSK4], 咸[HSK4], 喊[HSK2], 城[HSK3], 弋, 式, 感, 戈, 戋, 戏, 成[HSK2], 我[HSK1], 或[HSK2], 找[HSK1], 武, 线[HSK3], 试[HSK1], 越[HSK2], 钱[HSK1], 饿[HSK1]",
      "𫠣 via 练[HSK2]",
      "𫧇 via 能[HSK1]",
      "𫩠 via 堂, 常[HSK1]",
      "𫲸 via 害",
      "𫶧 via 流[HSK2]",
      "𬜯 via 满[HSK2]",
      "𭥴 via 增, 曾[HSK4]",
      "𭷔 via 解",
      " via 夜[HSK2]",
    ]
  `);
});

test(`dictionary structural components list`, async () => {
  const dictionary = await loadDictionary();
  const isStructuralHanzi = await getIsStructuralHanzi();

  const structural = dictionary.allHanziWords.filter((hanziWord) => {
    const hanzi = hanziFromHanziWord(hanziWord);
    return isHanziCharacter(hanzi) && isStructuralHanzi(hanzi);
  });

  expect(structural).toMatchInlineSnapshot(`
    [
      "𡗗:openHands",
      "丨:line",
      "丶:dot",
      "丿:slash",
      "𠂇:hand",
      "𠂉:knife",
      "𠂊:hands",
      "乚:hidden",
      "乚:second",
      "𠃌:radical",
      "亅:hook",
      "𭕄:radical",
      "忄:heart",
    ]
  `);
});

async function loadDebugNonCjkUnifiedIdeograph(): Promise<
  (char: string) => string
> {
  const kangxiRadicalToCjkRadical = await loadKangxiRadicalToCjkRadical();
  return (char: string) => {
    const unified = kangxiRadicalToCjkRadical(char);
    return unified == null
      ? `${char} -> ???`
      : `${char} (${char.codePointAt(0)?.toString(16)}) -> ${unified} (${unified.codePointAt(0)?.toString(16)})`;
  };
}

function isCjkUnifiedIdeograph(char: string): boolean {
  const codePoint = char.codePointAt(0);

  return (
    codePoint != null &&
    // CJK Unified Ideographs U+4E00 to U+9FFF
    ((codePoint >= 0x4e_00 && codePoint <= 0x9f_ff) ||
      // CJK Unified Ideographs Extension A U+3400 to U+4DBF
      (codePoint >= 0x34_00 && codePoint <= 0x4d_bf) ||
      // CJK Unified Ideographs Extension B U+20000 to U+2A6DF
      (codePoint >= 0x2_00_00 && codePoint <= 0x2_a6_df) ||
      // CJK Unified Ideographs Extension F U+2CEB0 to U+2EBEF
      (codePoint >= 0x2_ce_b0 && codePoint <= 0x2_eb_ef))
  );
}

function isNotCjkUnifiedIdeograph(char: string): boolean {
  return !isCjkUnifiedIdeograph(char);
}

async function loadKangxiRadicalToCjkRadical(): Promise<
  (kangxi: string) => string | undefined
> {
  const { EquivalentUnifiedIdeograph } = await import(
    `ucd-full/EquivalentUnifiedIdeograph.json`
  );
  return (kangxi: string): string | undefined => {
    const xCodePoint = kangxi.codePointAt(0)!;

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
  };
}

describe(
  `hanziFromHanziOrHanziWord suite` satisfies HasNameOf<
    typeof hanziFromHanziOrHanziWord
  >,
  async () => {
    test(`supports hanzi word`, () => {
      expect(hanziFromHanziOrHanziWord(`你好:hello`)).toEqual(`你好`);
    });

    test(`supports hanzi`, () => {
      expect(hanziFromHanziOrHanziWord(汉`你好`)).toEqual(`你好`);
    });
  },
);

describe(
  `upsertHanziWordMeaning suite` satisfies HasNameOf<
    typeof upsertHanziWordMeaning
  >,
  async () => {
    function helloDict(): DictionaryJson {
      const dict: DictionaryJson = new Map([
        [
          `你好:hello`,
          {
            gloss: [`hello`],
            pinyin: [拼音`ni hao`],
            pos: PartOfSpeech.Interjection,
          },
        ],
      ]);
      return dict;
    }

    test(`can update pinyin`, async () => {
      const dict = helloDict();

      upsertHanziWordMeaning(dict, `你好:hello`, {
        pinyin: [拼音`nǐ hǎo`],
      });

      expect(dict.get(`你好:hello`)).toEqual({
        gloss: [`hello`],
        pinyin: [拼音`nǐ hǎo`],
        pos: PartOfSpeech.Interjection,
      });
    });
  },
);

describe(
  `getIsStructuralHanzi suite` satisfies HasNameOf<typeof getIsStructuralHanzi>,
  () => {
    test(`fixtures`, async () => {
      const isStructuralHanzi = await getIsStructuralHanzi();

      expect(isStructuralHanzi(汉字`丿`)).toBe(true);
      expect(isStructuralHanzi(汉字`八`)).toBe(false);
    });
  },
);

describe(
  `oneUnitPinyinListOrNull suite` satisfies HasNameOf<
    typeof oneUnitPinyinListOrNull
  >,
  () => {
    test.for([
      [undefined, null],
      [null, null],
      [[], null],
      [[`nīhǎo`], null],
      [[拼音`nī hǎo`], null],
      [[拼音`nī`], `nī`],
      [[拼音`hǎo`], `hǎo`],
    ] as [readonly PinyinText[] | null | undefined, string | null][])(
      `%s → %s`,
      ([input, expected]) => {
        expect(oneUnitPinyinListOrNull(input)).toBe(expected);
      },
    );
  },
);

describe(
  `oneUnitPinyinOrNull suite` satisfies HasNameOf<typeof oneUnitPinyinOrNull>,
  () => {
    const meaning: HanziWordMeaning = {
      gloss: [`test`],
    };

    test.for([
      [meaning, null],
      [{ ...meaning, pinyin: [] }, null],
      [{ ...meaning, pinyin: [`nīhǎo`] }, null],
      [{ ...meaning, pinyin: [`nī hǎo`] }, null],
      [{ ...meaning, pinyin: [`nī hǎo`] }, null],
      [{ ...meaning, pinyin: [`nī`] }, `nī`],
      [{ ...meaning, pinyin: [`hǎo`] }, `hǎo`],
    ] as [HanziWordMeaning, string | null][])(
      `%s → %s`,
      ([input, expected]) => {
        expect(oneUnitPinyinOrNull(input)).toBe(expected);
      },
    );
  },
);

describe(`lookupPinyinUnit suite`, async () => {
  test(`returns array of HanziCharacters for a given PinyinUnit`, async () => {
    const dict = await loadDictionary();

    // Common pinyin unit 'ma' should have matches
    const maResults = dict.lookupPinyinUnit(`ma` as PinyinUnit);
    expect(Array.isArray(maResults)).toBe(true);
    expect(maResults.length).toBeGreaterThan(0);
  });

  test(`returns empty array for pinyin units with no matches`, async () => {
    const dict = await loadDictionary();

    // Using a very unlikely pinyin unit combination
    const results = dict.lookupPinyinUnit(`zz` as PinyinUnit);
    expect(results).toEqual([]);
  });

  test(`returns unique HanziCharacters (no duplicates)`, async () => {
    const dict = await loadDictionary();

    const results = dict.lookupPinyinUnit(`ma` as PinyinUnit);
    const uniqueResults = new Set(results);

    // All results should be unique
    expect(uniqueResults.size).toBe(results.length);
  });

  test(`returns valid HanziCharacters from dictionary`, async () => {
    const dict = await loadDictionary();
    const allDictionaryHanzi = new Set(
      dict.allHanziWords.flatMap((hanziWord) =>
        splitHanziText(hanziFromHanziWord(hanziWord)),
      ),
    );

    const results = dict.lookupPinyinUnit(`ma` as PinyinUnit);

    // All results should be valid hanzi characters from the dictionary
    for (const hanziChar of results) {
      expect(allDictionaryHanzi.has(hanziChar)).toBe(true);
    }
  });

  test(`matches pinyin units correctly across multi-character words`, async () => {
    const dict = await loadDictionary();

    // Test with 'ma' which should appear in multi-character words
    const maResults = dict.lookupPinyinUnit(`ma` as PinyinUnit);
    expect(maResults.length).toBeGreaterThan(0);

    // Verify that results contain single characters (not multi-character words)
    for (const char of maResults) {
      expect(char.length).toBe(1);
    }
  });

  test(`different pinyin units return different results`, async () => {
    const dict = await loadDictionary();

    const maResults = dict.lookupPinyinUnit(`ma` as PinyinUnit);
    const niResults = dict.lookupPinyinUnit(`ni` as PinyinUnit);

    // Results should be different sets
    const maSet = new Set(maResults);
    const niSet = new Set(niResults);

    // They should not be identical
    expect(
      maSet.size === niSet.size && maResults.length === niResults.length,
    ).not.toBe(true);
  });
});

describe(
  `parsePartOfSpeech suite` satisfies HasNameOf<typeof parsePartOfSpeech>,
  () => {
    test.for([
      [`noun,名,N`, PartOfSpeech.Noun],
      [`verb,动,V`, PartOfSpeech.Verb],
      [`adjective,形,Adj,Vs`, PartOfSpeech.Adjective],
      [`adverb,副,Adv`, PartOfSpeech.Adverb],
      [`pronoun,代,Pron,Det`, PartOfSpeech.Pronoun],
      [`numeral,数,Num`, PartOfSpeech.Numeral],
      [`measureWord,量,M`, PartOfSpeech.MeasureWordOrClassifier],
      [`preposition,介,Prep`, PartOfSpeech.Preposition],
      [`conjunction,连,Conj`, PartOfSpeech.Conjunction],
      [`particle,助,Aux,Ptc`, PartOfSpeech.AuxiliaryWordOrParticle],
      [`interjection,叹,Int`, PartOfSpeech.Interjection],
      [`prefix,前缀,Prefix`, PartOfSpeech.Prefix],
      [`suffix,后缀,Suffix`, PartOfSpeech.Suffix],
      [`phonetic,拟声,Phonetic`, PartOfSpeech.Phonetic],
      [`radical`, undefined],
    ] as const)(`fixture: %s → %s`, ([input, expected]) => {
      for (const text of input.split(`,`)) {
        expect.soft(parsePartOfSpeech(text), `parsing ${text}`).toBe(expected);
      }
    });

    test(
      `rPartOfSpeech marshaled values` satisfies HasNameOf<
        typeof rPartOfSpeech
      >,
      () => {
        for (const pos of Object.values(PartOfSpeech)) {
          const marshaled = rPartOfSpeech().marshal(pos);
          expect(parsePartOfSpeech(marshaled), `parsing ${marshaled}`).toBe(
            pos,
          );
        }
      },
    );
  },
);

describe(`decomposeHanziToIdsLeafs() suite`, () => {
  test(`includes each starting character`, async () => {
    const result = decomposeHanziToIdsLeafs(汉`说讠`, []);

    expect(result).toEqual([`说`, `讠`]);
  });

  test(`predicate applies to each starting character`, async () => {
    const result = decomposeHanziToIdsLeafs(
      汉`说讠`,
      [],
      (x): x is HanziCharacter => x === 汉`讠`,
    );

    expect(result).toEqual([`讠`]);
  });

  test(`supports multiple decompositions for a single hanzi`, async () => {
    const result = decomposeHanziToIdsLeafs(汉`说讠`, [
      { hanzi: 汉字`说`, ids: `⿰言兑` as HanziIds },
    ]);

    expect(result).toEqual([`说`, `讠`, `言`, `兑`]);
  });
});
