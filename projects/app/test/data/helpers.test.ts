// pyly-not-src-test

import type { HanziCharacter, PinyinUnit } from "#data/model.js";
import { MistakeKind } from "#data/model.js";
import { fsrsIsStable, Rating } from "#util/fsrs.ts";
import { describe, expect, test, vi } from "vitest";
import type { HistoryCommand } from "./helpers.ts";
import {
  date,
  fsrsSrsState,
  getHanziCharacterToPinyinUnit,
  parseDurationShorthand,
  parseHistoryCommand,
  parseRelativeTimeShorthand,
  pickExampleHanziForPinyinUnit,
  rankExampleHanziCandidates,
  时,
} from "./helpers.ts";

describe(
  `parseRelativeTimeShorthand suite` satisfies HasNameOf<
    typeof parseRelativeTimeShorthand
  >,
  () => {
    test(`assumes positive without a sign`, () => {
      expect(parseRelativeTimeShorthand(`1s`, new Date(0))).toEqual(
        new Date(1000),
      );
    });

    test(`supports negative durations`, () => {
      const now = new Date();
      expect(parseRelativeTimeShorthand(`-5m`, now)).toEqual(
        new Date(now.getTime() - 5 * 60 * 1000),
      );
    });

    test(`supports positive durations`, () => {
      const now = new Date();
      expect(parseRelativeTimeShorthand(`+5m`, now)).toEqual(
        new Date(now.getTime() + 5 * 60 * 1000),
      );
    });
  },
);

describe(`date suite` satisfies HasNameOf<typeof date>, () => {
  test(`parses values`, () => {
    vi.useFakeTimers({
      toFake: [`Date`],
      now: new Date(`2025-01-01T00:00:00Z`),
    });

    expect(date`+1d`).toEqual(parseRelativeTimeShorthand(`+1d`));
    expect(date`+1m`).toEqual(parseRelativeTimeShorthand(`+1m`));
  });
});

describe(`fsrsSrsState suite` satisfies HasNameOf<typeof fsrsSrsState>, () => {
  test(`with Hard rating fails "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Hard);
    expect(fsrsIsStable(state)).toEqual(false);
  });

  test(`with Good rating passes "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Good);
    expect(fsrsIsStable(state)).toEqual(true);
  });

  test(`with Easy rating passes "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Easy);
    expect(fsrsIsStable(state)).toEqual(true);
  });
});

describe(
  `parseDurationShorthand suite` satisfies HasNameOf<
    typeof parseDurationShorthand
  >,
  () => {
    test.for([
      [`30s`, { seconds: 30 }],
      [`+30s`, { seconds: 30 }],
      [`-30s`, { seconds: -30 }],
      [`30m`, { minutes: 30 }],
      [`+30m`, { minutes: 30 }],
      [`-30m`, { minutes: -30 }],
      [`1m2s`, { minutes: 1, seconds: 2 }],
      [`1m 2s`, { minutes: 1, seconds: 2 }],
      [`-1m 2s`, { minutes: -1, seconds: 2 }],
    ] as const)(`parses %s`, ([input, expected]) => {
      expect(parseDurationShorthand(input)).toEqual(expected);
    });

    test(`errors`, () => {
      expect(
        () => parseDurationShorthand(`5x`),
        `unsupported unit`,
      ).toThrowErrorMatchingInlineSnapshot(`[Error: invalid duration unit x]`);
    });
  },
);

describe(
  `parseHistoryCommand suite` satisfies HasNameOf<typeof parseHistoryCommand>,
  () => {
    test(`sleep`, () => {
      expect(parseHistoryCommand(`💤 5s`)).toEqual([
        { kind: `sleep`, duration: { seconds: 5 } },
      ]);
    });

    test.for([
      [`❌ he:分:divide`, Rating.Again, `he:分:divide`],
      [`🟢 he:分:divide`, Rating.Easy, `he:分:divide`],
      [`🟡 he:分:divide`, Rating.Good, `he:分:divide`],
      [`🟠 he:分:divide`, Rating.Hard, `he:分:divide`],
    ] as const)(
      `skill review without mistakes`,
      ([input, expectedRating, expectedSkill]) => {
        expect(parseHistoryCommand(input)).toEqual([
          {
            kind: `skillReview`,
            skill: expectedSkill,
            rating: expectedRating,
          },
        ]);
      },
    );

    test(`skill review with mistakes`, () => {
      // Implicit hanzi word: (xxx)
      expect(parseHistoryCommand(`❌ he:分:divide (xxx)`))
        .toMatchInlineSnapshot(`
          [
            {
              "kind": "skillReview",
              "mistake": {
                "gloss": "xxx",
                "hanziOrHanziWord": "分:divide",
                "kind": "debug--HanziGloss",
              },
              "rating": 1,
              "skill": "he:分:divide",
            },
          ]
        `);

      // Explicit hanzi: (刀→xxx)
      expect(parseHistoryCommand(`❌ he:分:divide (刀→xxx)`))
        .toMatchInlineSnapshot(`
          [
            {
              "kind": "skillReview",
              "mistake": {
                "gloss": "xxx",
                "hanziOrHanziWord": "刀",
                "kind": "debug--HanziGloss",
              },
              "rating": 1,
              "skill": "he:分:divide",
            },
          ]
        `);

      // Explicit hanzi word: (刀:foo→xxx)
      expect(parseHistoryCommand(`❌ he:分:divide (刀:foo→xxx)`))
        .toMatchInlineSnapshot(`
          [
            {
              "kind": "skillReview",
              "mistake": {
                "gloss": "xxx",
                "hanziOrHanziWord": "刀:foo",
                "kind": "debug--HanziGloss",
              },
              "rating": 1,
              "skill": "he:分:divide",
            },
          ]
        `);
    });

    test.for([
      [`❌ he:分:divide (xxx)`, `he:分:divide`, `分:divide`, `xxx`],
      [`❌ he:分:divide (刀→xxx)`, `he:分:divide`, `刀`, `xxx`],
      [`❌ he:分:divide (刀:foo→xxx)`, `he:分:divide`, `刀:foo`, `xxx`],
      [`❌ het:分:divide (刀:foo→xxx)`, `het:分:divide`, `刀:foo`, `xxx`],
    ] as const)(
      `hanzi gloss mistakes cases`,
      ([event, expectedSkill, expectedHanziOrHanziWord, expectedGloss]) => {
        expect(parseHistoryCommand(event)).toEqual([
          {
            kind: `skillReview`,
            skill: expectedSkill,
            rating: Rating.Again,
            mistake: {
              kind: MistakeKind.HanziGloss,
              hanziOrHanziWord: expectedHanziOrHanziWord,
              gloss: expectedGloss,
            },
          },
        ]);
      },
    );

    test.for([
      [`❌ hpi:分:divide (piě)`, `hpi:分:divide`, `分:divide`, `piě`],
      [`❌ hpi:分:divide (piě bāo)`, `hpi:分:divide`, `分:divide`, `piě bāo`],
      [`❌ hpi:分:divide (刀→piě)`, `hpi:分:divide`, `刀`, `piě`],
      [`❌ hpi:分:divide (刀:foo→piě)`, `hpi:分:divide`, `刀:foo`, `piě`],
      [`❌ hpt:分:divide (刀:foo→piě)`, `hpt:分:divide`, `刀:foo`, `piě`],
    ] as const)(
      `hanzi pinyin mistakes cases`,
      ([event, expectedSkill, expectedHanziOrHanziWord, expectedPinyin]) => {
        expect(parseHistoryCommand(event)).toEqual([
          {
            kind: `skillReview`,
            skill: expectedSkill,
            rating: Rating.Again,
            mistake: {
              kind: MistakeKind.HanziPinyin,
              hanziOrHanziWord: expectedHanziOrHanziWord,
              pinyin: expectedPinyin,
            },
          },
        ]);
      },
    );

    test(`hanziGloss mistake`, () => {
      expect(parseHistoryCommand(`❌hanziGloss a b`)).toMatchInlineSnapshot(`
        [
          {
            "kind": "hanziGlossMistake",
            "mistake": {
              "gloss": "b",
              "hanziOrHanziWord": "a",
              "kind": "debug--HanziGloss",
            },
          },
        ]
      `);
    });

    test(`hanziPinyin mistake`, () => {
      expect(parseHistoryCommand(`❌hanziPinyin a b c`)).toMatchInlineSnapshot(`
        [
          {
            "kind": "hanziPinyinMistake",
            "mistake": {
              "hanziOrHanziWord": "a",
              "kind": "debug--HanziPinyin",
              "pinyin": "b c",
            },
          },
        ]
      `);
    });

    test(`unknown op`, () => {
      expect(() =>
        parseHistoryCommand(`⚠️ xx` as HistoryCommand),
      ).toThrowErrorMatchingInlineSnapshot(`[Error: Invalid operation: ⚠️]`);
    });
  },
);

test(
  `rankExampleHanziCandidates` satisfies HasNameOf<
    typeof rankExampleHanziCandidates
  >,
  () => {
    const usageIndex = (
      entries: readonly [HanziCharacter, readonly [PinyinUnit, number][]][],
    ) => {
      const byHanzi = new Map<HanziCharacter, Map<PinyinUnit, number>>();
      const byPinyinUnit = new Map<PinyinUnit, Map<HanziCharacter, number>>();

      for (const [hanzi, pinyinCounts] of entries) {
        byHanzi.set(hanzi, new Map(pinyinCounts));

        for (const [pinyinUnit, count] of pinyinCounts) {
          let hanziCounts = byPinyinUnit.get(pinyinUnit);
          if (hanziCounts == null) {
            hanziCounts = new Map<HanziCharacter, number>();
            byPinyinUnit.set(pinyinUnit, hanziCounts);
          }

          hanziCounts.set(hanzi, count);
        }
      }

      return { byHanzi, byPinyinUnit };
    };

    expect(
      rankExampleHanziCandidates(
        `niǔ` as PinyinUnit,
        usageIndex([
          [
            `纽` as HanziCharacter,
            [
              [`niǔ` as PinyinUnit, 6],
              [`chǒu` as PinyinUnit, 1],
            ],
          ],
          [
            `扭` as HanziCharacter,
            [
              [`niǔ` as PinyinUnit, 5],
              [`niú` as PinyinUnit, 5],
            ],
          ],
          [
            `钮` as HanziCharacter,
            [
              [`niǔ` as PinyinUnit, 3],
              [`niú` as PinyinUnit, 10],
            ],
          ],
          [`彳` as HanziCharacter, [[`niǔ` as PinyinUnit, 99]]],
        ]),
      ).map(({ hanzi, usageCount }) => ({
        hanzi,
        usageCount,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "hanzi": "纽",
          "usageCount": 6,
        },
        {
          "hanzi": "扭",
          "usageCount": 5,
        },
        {
          "hanzi": "钮",
          "usageCount": 3,
        },
      ]
    `);

    expect(
      rankExampleHanziCandidates(
        `niǔ` as PinyinUnit,
        usageIndex([
          [
            `纽` as HanziCharacter,
            [
              [`niǔ` as PinyinUnit, 3],
              [`chǒu` as PinyinUnit, 1],
            ],
          ],
          [`扭` as HanziCharacter, [[`niǔ` as PinyinUnit, 3]]],
        ]),
      )
        .slice(0, 2)
        .map(({ hanzi, usageCount, usageShare }) => ({
          hanzi,
          usageCount,
          usageShare,
        })),
    ).toEqual([
      { hanzi: `扭`, usageCount: 3, usageShare: 1 },
      { hanzi: `纽`, usageCount: 3, usageShare: 0.75 },
    ]);
  },
);

describe(
  `pickExampleHanziForPinyinUnit` satisfies HasNameOf<
    typeof pickExampleHanziForPinyinUnit
  >,
  () => {
    test.for([
      [`chán`, `单`],
      [`là`, `落`],
      [`zǎng`, `驵`],
      [`zèng`, `综`],
      [`zhāi`, `侧`],
      [`zòng`, `从`],
      [`tóu`, `亠`],
      [`shǎi`, `色`],
      [`rǒu`, `肉`],
      [`rèng`, `芿`],
      [`rōng`, `茸`],
      [`rāng`, `嚷`],
      [`ōu`, `区`],
      [`òu`, `呕`],
      [`nè`, `疒`],
      [`fà`, `发`],
      [`lěi`, `累`],
      [`lóu`, `楼`],
      [`èn`, `嗯`],
      [`chòng`, `冲`],
      [`cào`, `草`],
      [`cī`, `差`],
      [`ē`, `阿`],
      [`ǒ`, `嚄`],
      [`ó`, `哦`],
      [`dū`, `都`],
      [`gèn`, `亘`],
      [`hè`, `和`],
      [`hòng`, `哄`],
      [`jū`, `据`],
      [`juān`, `圈`],
      [`kān`, `看`],
      [`kè`, `可`],
      [`lēi`, `勒`],
      [`lòng`, `弄`],
      [`mán`, `埋`],
      [`gā`, `夹`],
      [`gá`, `嘎`],
      [`dū`, `都`],
      [`duī`, `追`],
      [`duó`, `度`],
      [`fěi`, `菲`],
      [`fù`, `服`],
      [`gà`, `界`],
      [`gān`, `间`],
      [`gě`, `个`],
      [`háng`, `行`],
      [`sào`, `扫`],
    ] as [PinyinUnit, HanziCharacter][])(
      `Expected NOT to match: %s → %s`,
      async ([pinyinUnit, hanziCharacter]) => {
        const picked = await pickExampleHanziForPinyinUnit(pinyinUnit);
        expect(picked).not.toBe(hanziCharacter);
      },
    );

    test.for([
      [`gōu`, `钩`],
      // kei is not a valid Mandarin syllable in any t
      [`hāi`, null],
      [`kēi`, null],
      [`kéi`, null],
      [`kěi`, null],
      [`kèi`, null],
      [`hào`, `号`],
      [`chǎng`, `场`],
      [`cōng`, `葱`],
    ] as [PinyinUnit, HanziCharacter | null][])(
      `Expected match: %s → %s`,
      async ([pinyinUnit, hanziCharacter]) => {
        const picked = await pickExampleHanziForPinyinUnit(pinyinUnit);
        expect(picked).toBe(hanziCharacter);
      },
    );
  },
);

test(
  `getHanziCharacterToPinyinUnit` satisfies HasNameOf<
    typeof getHanziCharacterToPinyinUnit
  >,
  async () => {
    const map = await getHanziCharacterToPinyinUnit();

    expect(map.get(`亘` as HanziCharacter)).toMatchInlineSnapshot(`"gèn"`);
    expect(map.get(`捕` as HanziCharacter)).toMatchInlineSnapshot(`undefined`);
    expect(map.get(`句` as HanziCharacter)).toMatchInlineSnapshot(`undefined`);
    expect(map.get(`哈` as HanziCharacter)).toMatchInlineSnapshot(`"hā"`);
    expect(map.get(`咳` as HanziCharacter)).toMatchInlineSnapshot(`undefined`);
    expect(map.get(`厂` as HanziCharacter)).toMatchInlineSnapshot(`undefined`);
  },
);
