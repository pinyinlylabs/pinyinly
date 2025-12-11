import { splitHanziText } from "#data/hanzi.ts";
import type { HanziCharacter, HanziText } from "#data/model.ts";
import { pinyinPronunciationDisplayText } from "#data/pinyin.ts";
import type { Dictionary } from "#dictionary.ts";
import {
  decomposeHanzi,
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  hanziFromHanziOrHanziWord,
  hanziFromHanziWord,
  hanziWordMeaningSchema,
  loadCharacters,
  loadDictionary,
  loadHanziWordMigrations,
  loadHsk1HanziWords,
  loadHsk2HanziWords,
  loadHsk3HanziWords,
  loadKangXiRadicalsHanziWords,
  loadKangXiRadicalsStrokes,
  loadPinyinSoundNameSuggestions,
  loadPinyinSoundThemeDetails,
  loadPinyinWords,
  meaningKeyFromHanziWord,
  upsertHanziWordMeaning,
} from "#dictionary.ts";
import {
  mapSetAdd,
  mergeSortComparators,
  sortComparatorNumber,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { 拼音, 汉 } from "./data/helpers.ts";

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
  await loadHsk1HanziWords();
  await loadHsk2HanziWords();
  await loadHsk3HanziWords();
  await loadCharacters();
  await loadPinyinSoundNameSuggestions();
  await loadPinyinSoundThemeDetails();
  await loadPinyinWords();
  await loadDictionary();
});

const wordLists = [
  loadHsk1HanziWords,
  loadHsk2HanziWords,
  loadHsk3HanziWords,
  loadKangXiRadicalsHanziWords,
];

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

  // no meaning-key is just a prefix of a sibling meaning-key
  for (const [hanzi, meaningKeys] of hanziToMeaningKey) {
    for (let i = 0; i < meaningKeys.length - 1; i++) {
      for (let j = i + 1; j < meaningKeys.length; j++) {
        const a = meaningKeys[i];
        const b = meaningKeys[j];
        invariant(a != null && b != null);

        if (b.startsWith(a)) {
          throw new Error(
            `${hanzi} meaning-keys ${a} and ${b} are too similar`,
          );
        }
      }
    }
  }
});

test(`hanzi word meaning-key lint`, async () => {
  const dict = await loadDictionary();

  const isViolating = (x: string) =>
    // no "measure word" or "radical"
    /measure ?word| radical/i.exec(x) != null ||
    // only allow english alphabet
    !/^[a-zA-Z]+$/.test(x);

  const violations = new Set(
    dict.allHanziWords.filter((hanziWord) =>
      isViolating(meaningKeyFromHanziWord(hanziWord)),
    ),
  );

  expect(violations).toEqual(new Set());
});

test(`hanzi word meaning gloss lint`, async () => {
  const dict = await loadDictionary();

  const maxWords = 4;
  const maxSpaces = maxWords - 1;

  const isViolating = (x: string) =>
    // no comma
    /,/.exec(x) != null ||
    // no banned characters/phrases
    /measure ?word|radical|particle|\(/i.exec(x) != null ||
    (x.match(/\s+/g)?.length ?? 0) > maxSpaces;

  const violations = new Set(
    dict.allEntries
      .filter(([, { gloss }]) => gloss.some((x) => isViolating(x)))
      .map(([hanziWord, { gloss }]) => ({
        hanziWord,
        gloss: gloss.filter((x) => isViolating(x)),
      })),
  );

  expect(violations).toEqual(new Set());
});

test(`hanzi meaning canonicalForm`, async () => {
  const characters = await loadCharacters();
  const dictionary = await loadDictionary();

  for (const [hanzi, data] of characters) {
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

  // Multiple pinyin entries should have the same number of words
  for (const [hanziWord, { pinyin }] of dict.allEntries) {
    expect
      .soft(new Set(pinyin?.map((p) => p.length)).size, hanziWord)
      .not.toBeGreaterThan(1);
  }
});

test(`hanzi words are unique on (meaning key, primary pinyin)`, async () => {
  const exceptions = new Set(
    [[`他们:they`, `它们:they`, `她们:they`]].map((x) => new Set(x)),
  );

  const dict = await loadDictionary();
  const isComponentFormHanzi = await getIsComponentFormHanzi();

  const byMeaningKeyAndPinyin = new Map<string, Set<string>>();
  for (const [hanziWord, { pinyin }] of dict.allEntries) {
    const meaningKey = meaningKeyFromHanziWord(hanziWord);
    // special case allow "radical" to have overlaps
    if (meaningKey === `radical`) {
      continue;
    }
    // allow component-form of hanzi to have overlaps
    if (isComponentFormHanzi(hanziFromHanziWord(hanziWord))) {
      continue;
    }
    const primaryPinyin = pinyin?.[0];
    const key = `${meaningKey}:${primaryPinyin == null ? `<nullish>` : pinyinPronunciationDisplayText(primaryPinyin)}`;
    const set = byMeaningKeyAndPinyin.get(key) ?? new Set();
    set.add(hanziWord);
    byMeaningKeyAndPinyin.set(key, set);
  }

  // Make sure that there is only one hanzi word for each meaning key and
  // pinyin, but do it in a way to give a helpful error message.
  const duplicates = [...byMeaningKeyAndPinyin.values()].filter(
    (x) => x.size > 1,
  );

  // Check that there are no duplicates (except for the exceptions).
  expect(
    duplicates.filter(
      (x) =>
        !exceptions.values().some((e) => x.symmetricDifference(e).size === 0),
    ),
  ).toEqual([]);

  // Check that all exceptions are actually used.
  for (const exception of exceptions) {
    if (!duplicates.some((x) => x.symmetricDifference(exception).size === 0)) {
      throw new Error(`exception ${[...exception]} is not used`);
    }
  }
});

test(`hanzi words are unique on (hanzi, part-of-speech, pinyin)`, async () => {
  const exceptions = new Set(
    [
      [`从来:always`, `从来:never`],
      [`块:currency`, `块:pieces`],
      [`天:day`, `天:sky`],
      [`家:family`, `家:home`],
      [`提:carry`, `提:mention`],
      [`米:rice`, `米:meter`],
      [`菜:dish`, `菜:vegetable`],
      [`行:okay`, `行:walk`],
      [`表:surface`, `表:watch`],
      [`要:must`, `要:want`],
      [`面:face`, `面:surface`],
      [`乚:hidden`, `乚:second`],
    ].map((x) => new Set(x)),
  );

  const dict = await loadDictionary();

  const byHanziAndPinyin = new Map<string, Set<string>>();
  for (const [hanziWord, { partOfSpeech, pinyin }] of dict.allEntries) {
    const hanzi = hanziFromHanziWord(hanziWord);
    const key = `${hanzi}:${partOfSpeech}:${pinyin}`;
    const set = byHanziAndPinyin.get(key) ?? new Set();
    set.add(hanziWord);
    byHanziAndPinyin.set(key, set);
  }

  // Make sure that there is only one hanzi word for each hanzi and
  // pinyin, but do it in a way to give a helpful error message.
  const duplicates = [...byHanziAndPinyin.values()].filter((x) => x.size > 1);

  // Check that all exceptions are actually used.
  for (const exception of exceptions) {
    if (!duplicates.some((x) => x.symmetricDifference(exception).size === 0)) {
      throw new Error(`exception ${[...exception]} is not used`);
    }
  }

  // Check that there are no duplicates (except for the exceptions).
  expect(
    duplicates.filter(
      (x) =>
        !exceptions.values().some((e) => x.symmetricDifference(e).size === 0),
    ),
  ).toEqual([]);
});

test(`all word lists only reference valid hanzi words`, async () => {
  const dict = await loadDictionary();
  for (const wordList of wordLists) {
    for (const hanziWord of await wordList()) {
      if (dict.lookupHanziWord(hanziWord) === null) {
        throw new Error(
          `missing hanzi word lookup for ${hanziWord} in word list`,
        );
      }
    }
  }
});

test(`zod schemas are compatible with OpenAI API`, async () => {
  function assertCompatible(schema: z.ZodType): void {
    const jsonSchema = JSON.stringify(
      z.toJSONSchema(schema, { unrepresentable: `any` }),
    );

    // `z.array(…).min(…) is not supported by OpenAI API`,
    expect(jsonSchema).not.toMatch(/"minItems":/g);

    // `z.array(…).max(…) is not supported by OpenAI API`,
    expect(jsonSchema).not.toMatch(/"maxItems":/g);
  }

  assertCompatible(hanziWordMeaningSchema);
});

test(`hanzi uses consistent unicode characters`, async () => {
  const debugNonCjkUnifiedIdeograph = await loadDebugNonCjkUnifiedIdeograph();
  const dict = await loadDictionary();
  const characters = await loadCharacters();

  const violations = dict.allHanziWords
    .map((x) => hanziFromHanziWord(x))
    .flatMap((x) => splitHanziText(x))
    .filter((x) => characters.get(x)?.isStructural !== true)
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
  const dictionaryLookup = await loadDictionary();
  const characters = await loadCharacters();

  const allHanzi = dictionaryLookup.allHanziWords.map((hanziWord) =>
    hanziFromHanziWord(hanziWord),
  );

  for (const hanzi of allHanzi) {
    for (const character of splitHanziText(hanzi)) {
      const meanings = dictionaryLookup.lookupHanzi(character);
      if (meanings.length === 0) {
        mapSetAdd(unknownCharacters, character, hanzi);
      }

      for (const component of await decomposeHanzi(character)) {
        if (characters.get(component)?.canonicalForm != null) {
          // The character is a pointer to another character, so it itself
          // doesn't need a dictionary entry.
          continue;
        }

        const lookup = dictionaryLookup.lookupHanzi(component);
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

  const hsk1HanziWords = new Set(
    await loadHsk1HanziWords().then((wordList) =>
      wordList.map((hanziWord) => hanziFromHanziWord(hanziWord)),
    ),
  );
  const hsk2HanziWords = new Set(
    await loadHsk2HanziWords().then((wordList) =>
      wordList.map((hanziWord) => hanziFromHanziWord(hanziWord)),
    ),
  );
  const hsk3HanziWords = new Set(
    await loadHsk3HanziWords().then((wordList) =>
      wordList.map((hanziWord) => hanziFromHanziWord(hanziWord)),
    ),
  );
  function hskLabel(hanzi: HanziText): string {
    return hsk1HanziWords.has(hanzi)
      ? `[HSK1]`
      : hsk2HanziWords.has(hanzi)
        ? `[HSK2]`
        : hsk3HanziWords.has(hanzi)
          ? `[HSK3]`
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
      "⺀ via 冬, 头[HSK2], 尽",
      "⺄ via 九[HSK1]",
      "⺆ via 周[HSK2]",
      "⺈ via 争[HSK3], 免, 欠, 色, 角[HSK2], 象, 负, 鱼[HSK2]",
      "⺧ via 先[HSK1], 告",
      "⺶ via 养[HSK2]",
      "⺺ via 隶",
      "〢 via 坚, 紧[HSK3]",
      "コ via 彐",
      "ュ via 候, 敢[HSK3]",
      "㇀ via 七[HSK1]",
      "㇂ via 民",
      "㇇ via 今, 水[HSK1]",
      "㇉ via 丂",
      "㇖ via 疋",
      "㐄 via 舛",
      "㐫 via 离[HSK2], 脑",
      "㐬 via 流[HSK2]",
      "㔾 via 危",
      "㔿 via 耳",
      "㝵 via 得[HSK2]",
      "㡀 via 黹",
      "䏍 via 能[HSK1]",
      "丅 via 斤[HSK2], 鬲",
      "丆 via 才[HSK2], 石, 面[HSK2], 页[HSK1]",
      "丙 via 病[HSK1]",
      "並 via 普, 碰[HSK2]",
      "丩 via 叫[HSK1], 收[HSK2], 爿",
      "丬 via 将, 状",
      "乀 via 乂, 水[HSK1]",
      "乁 via 气[HSK2]",
      "乇 via 毛[HSK1]",
      "乔 via 桥[HSK3]",
      "乛 via 买[HSK1], 了[HSK1]",
      "乞 via 吃[HSK1]",
      "亇 via 竹",
      "予 via 舒, 预",
      "亍 via 行[HSK1], 街[HSK2]",
      "亘 via 宣",
      "亦 via 变[HSK2]",
      "亭 via 停[HSK2]",
      "亽 via 今, 令",
      "仌 via 肉[HSK1]",
      "仑 via 论",
      "仓 via 创",
      "余 via 除",
      "俞 via 输[HSK3]",
      "允 via 充",
      "兆 via 跳[HSK3]",
      "兑 via 说[HSK1]",
      "兰 via 羊[HSK3]",
      "冃 via 冒",
      "円 via 靑",
      "冈 via 刚[HSK2]",
      "冉 via 再[HSK1]",
      "冋 via 向[HSK2], 高[HSK1]",
      "冏 via 商",
      "凡 via 赢[HSK3]",
      "刍 via 急[HSK2]",
      "刖 via 前[HSK1]",
      "列 via 例, 烈",
      "勺 via 的[HSK1], 约[HSK3]",
      "卄 via 甘, 龷",
      "卅 via 带[HSK2]",
      "卌 via 舞",
      "卑 via 啤, 牌",
      "卬 via 迎",
      "却 via 脚[HSK2]",
      "厃 via 危",
      "厄 via 顾",
      "叚 via 假[HSK2]",
      "叩 via 命",
      "召 via 绍, 超",
      "吉 via 结",
      "吏 via 使[HSK3]",
      "吕 via 营",
      "君 via 群[HSK3], 裙",
      "吴 via 误",
      "吾 via 语",
      "呆 via 保[HSK3]",
      "呈 via 程",
      "咅 via 部[HSK3]",
      "咸 via 喊[HSK2], 感",
      "唐 via 糖[HSK3]",
      "啬 via 墙[HSK2]",
      "喿 via 澡",
      "囬 via 面[HSK2]",
      "圡 via 压[HSK3]",
      "圣 via 怪",
      "垂 via 睡[HSK1]",
      "壬 via 任[HSK3]",
      "壮 via 装[HSK2]",
      "壴 via 喜, 鼓",
      "央 via 英",
      "奂 via 换[HSK2]",
      "奴 via 努",
      "妾 via 接[HSK2]",
      "娄 via 数[HSK2], 楼[HSK1]",
      "孝 via 教[HSK1]",
      "孰 via 熟[HSK2]",
      "官 via 管[HSK3], 馆",
      "宛 via 碗[HSK2]",
      "寅 via 演[HSK3]",
      "射 via 谢",
      "尔 via 你[HSK1], 称[HSK2]",
      "尺 via 尽",
      "尼 via 呢[HSK1]",
      "居 via 剧, 据",
      "屯 via 顿[HSK3]",
      "川 via 训, 顺",
      "巩 via 恐",
      "帀 via 师",
      "庄 via 脏[HSK2]",
      "库 via 裤",
      "廷 via 庭, 挺[HSK2]",
      "廿 via 世, 度[HSK2], 革",
      "弗 via 费[HSK3]",
      "彑 via 互",
      "彦 via 颜",
      "戉 via 越[HSK2]",
      "戊 via 成[HSK2]",
      "戶 via 所[HSK3]",
      "扁 via 篇[HSK2], 遍[HSK2]",
      "执 via 势, 热[HSK1]",
      "敕 via 整[HSK3]",
      "敬 via 警",
      "斥 via 诉",
      "斿 via 游[HSK3]",
      "既 via 概",
      "旨 via 指[HSK3]",
      "昌 via 唱[HSK1]",
      "昏 via 婚",
      "昭 via 照[HSK3]",
      "昷 via 温",
      "曷 via 喝[HSK1], 渴[HSK1]",
      "杲 via 桌",
      "林 via 楚, 麻",
      "氾 via 范",
      "泉 via 原",
      "洛 via 落",
      "炎 via 谈[HSK3]",
      "焦 via 蕉",
      "爰 via 暖",
      "玨 via 班[HSK1]",
      "甬 via 痛[HSK3], 通[HSK2]",
      "甲 via 单, 里[HSK1]",
      "申 via 神",
      "甶 via 鬼",
      "畀 via 鼻",
      "番 via 播",
      "监 via 篮, 蓝[HSK2]",
      "祭 via 察",
      "禹 via 属[HSK3]",
      "竟 via 境",
      "罒 via 曼",
      "罙 via 深[HSK3]",
      "肀 via 聿",
      "肖 via 消",
      "肰 via 然",
      "胡 via 湖[HSK2]",
      "舍 via 舒",
      "苗 via 猫[HSK2]",
      "董 via 懂[HSK2]",
      "覀 via 票[HSK1], 要[HSK1], 鹿",
      "觜 via 嘴[HSK2]",
      "贯 via 惯",
      "迶 via 随[HSK3]",
      "邦 via 帮[HSK1]",
      "镸 via 套[HSK2], 髟",
      "阿 via 啊[HSK2]",
      "龰 via 疋, 走[HSK1], 足",
      "龱 via 卤",
      "龴 via 令, 矛",
      "龵 via 看[HSK1]",
      "𠀐 via 贵[HSK1]",
      "𠂈 via 亥",
      "𠂋 via 后[HSK1]",
      "𠂢 via 派[HSK3]",
      "𠂤 via 追[HSK3]",
      "𠃊 via 亡, 断[HSK3], 继",
      "𠃓 via 场[HSK2], 汤[HSK3]",
      "𠃜 via 声",
      "𠄎 via 乃",
      "𠄐 via 矛",
      "𠕁 via 龠",
      "𠕒 via 雨[HSK1]",
      "𠚍 via 鬯",
      "𠚕 via 齒",
      "𠤎 via 化[HSK3]",
      "𠦝 via 朝[HSK3]",
      "𠫓 via 育",
      "𠫔 via 至",
      "𠬝 via 报[HSK3], 服",
      "𠮛 via 司, 同, 畐, 豆, 鬲",
      "𠮦 via 总[HSK3]",
      "𠮷 via 周[HSK2]",
      "𠱠 via 龠",
      "𡗗 via 春",
      "𡨄 via 赛",
      "𡿨 via 巛",
      "𢀖 via 经, 轻[HSK2]",
      "𢆉 via 南[HSK1], 幸",
      "𢎨 via 弟, 第[HSK1]",
      "𣥂 via 步[HSK3]",
      "𣦼 via 餐",
      "𤴓 via 定, 是[HSK1]",
      "𦍌 via 美[HSK3]",
      "𦓐 via 而",
      "𦣻 via 夏",
      "𧰨 via 豕",
      "𨈑 via 身",
      "𪧷 via 将",
      "𫝀 via 五[HSK1]",
      "𫠠 via 弋",
      "𫠣 via 练[HSK2]",
      "𫧇 via 能[HSK1]",
      "𫩠 via 堂, 常[HSK1]",
      "𫲸 via 害",
      "𬜯 via 满[HSK2]",
      "𭥴 via 曾",
      "𭷔 via 解",
      " via 夜[HSK2]",
    ]
  `);
});

test(`dictionary structural components list`, async () => {
  const dictionary = await loadDictionary();
  const isStructuralHanzi = await getIsStructuralHanzi();

  const structural = dictionary.allHanziWords.filter((hanziWord) =>
    isStructuralHanzi(hanziFromHanziWord(hanziWord)),
  );

  expect(structural).toMatchInlineSnapshot(`
    [
      "丨:line",
      "丶:dot",
      "丷:earsOut",
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
    ((codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      // CJK Unified Ideographs Extension A U+3400 to U+4DBF
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      // CJK Unified Ideographs Extension B U+20000 to U+2A6DF
      (codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
      // CJK Unified Ideographs Extension F U+2CEB0 to U+2EBEF
      (codePoint >= 0x2ceb0 && codePoint <= 0x2ebef))
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
    function helloDict(): Dictionary {
      const dict: Dictionary = new Map();
      dict.set(`你好:hello`, {
        gloss: [`hello`],
        pinyin: [[拼音`ni`, 拼音`hao`]],
        partOfSpeech: `interjection`,
      });
      return dict;
    }

    test(`can update pinyin`, async () => {
      const dict = helloDict();

      upsertHanziWordMeaning(dict, `你好:hello`, {
        pinyin: [[拼音`nǐ`, 拼音`hǎo`]],
      });

      expect(dict.get(`你好:hello`)).toEqual({
        gloss: [`hello`],
        pinyin: [[拼音`nǐ`, 拼音`hǎo`]],
        partOfSpeech: `interjection`,
      });
    });
  },
);

describe(
  `getIsStructuralHanzi suite` satisfies HasNameOf<typeof getIsStructuralHanzi>,
  () => {
    test(`fixtures`, async () => {
      const isStructuralHanzi = await getIsStructuralHanzi();

      expect(isStructuralHanzi(`丿` as HanziText)).toBe(true);
      expect(isStructuralHanzi(`八` as HanziText)).toBe(false);
    });
  },
);
