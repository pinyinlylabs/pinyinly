import type {
  CollectionOutput,
  DictionarySearchEntry,
  HistoryPageCollection,
  HistoryPageData,
  SettingCollection,
} from "#client/query.js";
import {
  getPrioritizedHanziWords,
  historyPageCollection,
  historyPageData,
} from "#client/query.js";
import { matchAllHanziCharacters } from "#data/hanzi.ts";
import {
  getUserHanziMeaningKeyParams,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
} from "#data/userSettings.ts";
import type { Dictionary } from "#dictionary.js";
import { loadDictionary } from "#dictionary.js";
import { seedSkillReviews, 汉 } from "#test/data/helpers.ts";
import { formatTimeOffset, ratingToEmoji } from "#test/helpers.ts";
import { dbFixture, rizzleFixture } from "#test/util/rizzleHelpers.ts";
import {
  afterEach,
  test as baseTest,
  beforeAll,
  beforeEach,
  describe,
  expect,
  vi,
} from "vitest";

beforeAll(async () => {
  // Preload the dictionary as it needs to be used synchronously during replicache
  // mutators.
  await loadDictionary();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: [`Date`] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe(
  `historyPageCollection suite` satisfies HasNameOf<
    typeof historyPageCollection
  >,
  () => {
    const test = baseTest
      .extend(rizzleFixture)
      .extend(dbFixture)
      .extend<{ collection: HistoryPageCollection }>({
        collection: [
          async ({ db }, use) => {
            const collection = historyPageCollection(
              db.skillRatingCollection,
              db.hanziGlossMistakeCollection,
              db.hanziPinyinMistakeCollection,
            );
            await use(collection);
          },
          { scope: `test` },
        ],
      });

    test(`groups together sequential ratings for the same skill`, async ({
      collection,
      rizzle,
    }) => {
      await seedSkillReviews(rizzle, [
        `❌ he:刀:knife (legs)`,
        `💤 5s`,
        `🟢 he:刀:knife`,
        `💤 5s`,
        `❌ hp:刀:knife (bí)`,
        `💤 10s`,
        `🟡 he:丿:slash`,
        `💤 15s`,
        `🟢 he:刀:knife`, // Different group since it's not sequential
        `💤 6m`,
        `🟡 he:𠃌:radical`,
      ]);

      await collection.preload();

      const result = historyPageData(collection.toArray);

      expect(prettyData(result)).toMatchInlineSnapshot(`
        "Session 00:06:35-00:06:35:
        he:𠃌:radical: 🟡 00:06:35
        ---
        Session 00:00:00-00:00:35:
        he:刀:knife: 🟢 00:00:35
        he:丿:slash: 🟡 00:00:20
        hp:刀:knife: ❌(bí) 00:00:10
        he:刀:knife: 🟢 00:00:05, ❌(legs) 00:00:00"
      `);
    });

    test(`uses mistakes at the same time and skill`, async ({
      collection,
      rizzle,
    }) => {
      await seedSkillReviews(rizzle, [
        `❌ he:刀:knife`,
        `❌hanziGloss 刀:knife foo`,
        `💤 5s`,
        `❌hanziGloss 我:i baz`,
        `💤 1m`,
        `❌ hpi:刀:knife`,
        `❌hanziPinyin 刀:knife pié`,
        `💤 5s`,
        `❌hanziPinyin 我:i bǎo`,
      ]);

      await collection.preload();

      const result = historyPageData(collection.toArray);

      expect(prettyData(result)).toMatchInlineSnapshot(`
        "Session 00:00:00-00:01:05:
        hpi:刀:knife: ❌(pié) 00:01:05
        he:刀:knife: ❌(foo) 00:00:00"
      `);
    });

    test(`supports "hanzi" values in hanziOrHanziWord mistakes`, async ({
      collection,
      rizzle,
    }) => {
      await seedSkillReviews(rizzle, [
        // Different ordering of rows doesn't matter
        `❌ he:刀:knife`,
        `❌hanziGloss 刀 foo`,
        `💤 5s`,
        `❌hanziGloss 刀狗 baz`,
        `❌hanziGloss 我 baz`,
        `💤 1m`,
        `❌ he:刀:knife`,
        `❌hanziGloss 刀 foo`,
        `💤 5s`,
        `❌hanziGloss 刀狗 baz`,
        `❌hanziGloss 我 baz`,
        `💤 1m`,
        `❌ hpi:刀:knife`,
        `❌hanziPinyin 刀 pié`,
        `💤 5s`,
        `❌hanziPinyin 我 bǎo`,
        `❌hanziPinyin 刀狗 wǒ`,
        `💤 1m`,
        `❌ hpi:刀:knife`,
        `❌hanziPinyin 刀 pié`,
        `💤 5s`,
        `❌hanziPinyin 刀狗 wǒ`,
        `❌hanziPinyin 我 bǎo`,
        `💤 1m`,
        // Supports two-character words
        `❌ he:里边:inside`,
        `❌hanziGloss 里边 foo`,
        `💤 5s`,
        `❌hanziGloss 我 baz`,
        `❌hanziGloss 里边狗 baz`,
      ]);

      await collection.preload();

      const result = historyPageData(collection.toArray);

      expect(prettyData(result)).toMatchInlineSnapshot(`
        "Session 00:00:00-00:04:20:
        he:里边:inside: ❌(foo) 00:04:20
        hpi:刀:knife: ❌(pié) 00:03:15, ❌(pié) 00:02:10
        he:刀:knife: ❌(foo) 00:01:05, ❌(foo) 00:00:00"
      `);
    });
  },
);

function prettyData(data: HistoryPageData): string {
  return data
    .map(
      (session) =>
        `Session ${formatTimeOffset(session.startTime)}-${formatTimeOffset(session.endTime)}:\n${session.groups
          .map(
            (skillGroup) =>
              `${skillGroup.skill}: ${skillGroup.ratings
                .map(
                  (rating) =>
                    `${ratingToEmoji(rating.rating)}${rating.answer == null ? `` : `(${rating.answer})`} ${formatTimeOffset(rating.createdAt)}`,
                )
                .join(`, `)}`,
          )
          .join(`\n`)}`,
    )
    .join(`\n---\n`);
}

const mockDictionary = {
  lookupHanzi: (hanzi: string) => {
    // Mock: "纸" has multiple hanziwords
    if (hanzi === `纸`) {
      return [
        [`纸:paper` as any, { gloss: [`paper`] }],
        [`纸:tissue` as any, { gloss: [`tissue`] }],
      ];
    }
    return [];
  },
} as unknown as Dictionary;

describe(
  `getPrioritizedHanziWords suite` satisfies HasNameOf<
    typeof getPrioritizedHanziWords
  >,
  () => {
    baseTest(`reads prioritized words from value payload`, () => {
      const result = getPrioritizedHanziWords(
        [settingRow({ key: `pwi/你好:hello`, value: { w: `你好:hello` } })],
        mockDictionary,
      );

      expect(result).toEqual([`你好:hello`]);
    });

    baseTest(`falls back to key when payload omits word field`, () => {
      // useUserSetting strips key params from setting values, so `w` may be absent.
      const result = getPrioritizedHanziWords(
        [
          settingRow({
            key: `pwi/你好:hello`,
            value: { c: new Date().toISOString() },
          }),
        ],
        mockDictionary,
      );

      expect(result).toEqual([`你好:hello`]);
    });

    baseTest(`expands single hanzi to all its hanziwords`, () => {
      const result = getPrioritizedHanziWords(
        [
          settingRow({
            key: `pwi/纸`,
            value: { c: new Date().toISOString() },
          }),
        ],
        mockDictionary,
      );

      expect(result).toEqual([`纸:paper`, `纸:tissue`]);
    });

    baseTest(`filters unrelated keys and deduplicates words`, () => {
      const result = getPrioritizedHanziWords(
        [
          settingRow({ key: `pwi/你好:hello`, value: { w: `你好:hello` } }),
          settingRow({ key: `userName`, value: { t: `Brad` } }),
          settingRow({
            key: `pwi/你好:hello`,
            value: { c: new Date().toISOString() },
          }),
          settingRow({ key: `pwi/再见:goodbye`, value: { w: `再见:goodbye` } }),
        ],
        mockDictionary,
      );

      expect(result).toEqual([`你好:hello`, `再见:goodbye`]);
    });
  },
);

describe(`userDictionaryCollectionOptions`, () => {
  const test = baseTest.extend(rizzleFixture).extend(dbFixture);

  test(`builds rows from user hanzi meaning settings`, async ({
    db,
    rizzle,
  }) => {
    const meaningA = getUserHanziMeaningKeyParams(汉`好`, `u_meaningA`);
    const meaningB = getUserHanziMeaningKeyParams(汉`好`, `u_meaningB`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(meaningA),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...meaningA,
        text: `good`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await rizzle.mutate.setSetting({
      key: userHanziMeaningPinyinSetting.entity.marshalKey(meaningA),
      value: userHanziMeaningPinyinSetting.entity.marshalValue({
        ...meaningA,
        text: `hǎo`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await rizzle.mutate.setSetting({
      key: userHanziMeaningNoteSetting.entity.marshalKey(meaningA),
      value: userHanziMeaningNoteSetting.entity.marshalValue({
        ...meaningA,
        text: `common adjective`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(meaningB),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...meaningB,
        text: `to like`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    await db.userDictionary.preload();

    expect(db.userDictionary.get(`好:u_meaningA`)).toEqual({
      hanzi: `好`,
      meaningKey: `u_meaningA`,
      gloss: `good`,
      pinyin: `hǎo`,
      note: `common adjective`,
    });
    expect(db.userDictionary.get(`好:u_meaningB`)).toEqual({
      hanzi: `好`,
      meaningKey: `u_meaningB`,
      gloss: `to like`,
      pinyin: undefined,
      note: undefined,
    });
  });

  test(`adds pinyin field after gloss`, async ({ db, rizzle }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`行`, `u_walk`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `to walk`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.userDictionary.preload();

    expect(db.userDictionary.get(`行:u_walk`)).toEqual({
      hanzi: `行`,
      meaningKey: `u_walk`,
      gloss: `to walk`,
      pinyin: undefined,
      note: undefined,
    });

    await rizzle.mutate.setSetting({
      key: userHanziMeaningPinyinSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningPinyinSetting.entity.marshalValue({
        ...keyParams,
        text: `xíng`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`行:u_walk`)).toEqual({
      hanzi: `行`,
      meaningKey: `u_walk`,
      gloss: `to walk`,
      pinyin: `xíng`,
      note: undefined,
    });
  });

  test(`adds note field after gloss`, async ({ db, rizzle }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`行`, `u_walk`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `to walk`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.userDictionary.preload();

    await rizzle.mutate.setSetting({
      key: userHanziMeaningNoteSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningNoteSetting.entity.marshalValue({
        ...keyParams,
        text: `common verb`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`行:u_walk`)).toEqual({
      hanzi: `行`,
      meaningKey: `u_walk`,
      gloss: `to walk`,
      pinyin: undefined,
      note: `common verb`,
    });
  });

  test(`updates gloss field`, async ({ db, rizzle }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`行`, `u_walk`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `to walk`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.userDictionary.preload();

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `to go on foot`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`行:u_walk`)).toEqual({
      hanzi: `行`,
      meaningKey: `u_walk`,
      gloss: `to go on foot`,
      pinyin: undefined,
      note: undefined,
    });
  });

  test(`updates pinyin field`, async ({ db, rizzle }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`行`, `u_walk`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `to walk`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await rizzle.mutate.setSetting({
      key: userHanziMeaningPinyinSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningPinyinSetting.entity.marshalValue({
        ...keyParams,
        text: `xíng`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.userDictionary.preload();

    await rizzle.mutate.setSetting({
      key: userHanziMeaningPinyinSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningPinyinSetting.entity.marshalValue({
        ...keyParams,
        text: `háng`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`行:u_walk`)).toEqual({
      hanzi: `行`,
      meaningKey: `u_walk`,
      gloss: `to walk`,
      pinyin: `háng`,
      note: undefined,
    });
  });

  test(`updates note field`, async ({ db, rizzle }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`行`, `u_walk`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `to walk`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await rizzle.mutate.setSetting({
      key: userHanziMeaningNoteSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningNoteSetting.entity.marshalValue({
        ...keyParams,
        text: `common verb`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.userDictionary.preload();

    await rizzle.mutate.setSetting({
      key: userHanziMeaningNoteSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningNoteSetting.entity.marshalValue({
        ...keyParams,
        text: `HSK 1 verb`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`行:u_walk`)).toEqual({
      hanzi: `行`,
      meaningKey: `u_walk`,
      gloss: `to walk`,
      pinyin: undefined,
      note: `HSK 1 verb`,
    });
  });

  test(`removes row when gloss is deleted`, async ({ db, rizzle }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`里`, `u_inside`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `inside`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await rizzle.mutate.setSetting({
      key: userHanziMeaningPinyinSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningPinyinSetting.entity.marshalValue({
        ...keyParams,
        text: `lǐ`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    await db.userDictionary.preload();
    expect(db.userDictionary.get(`里:u_inside`)).not.toBeUndefined();

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: null,
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`里:u_inside`)).toBeUndefined();
  });
});

function settingRow({
  key,
  value,
}: {
  key: string;
  value: Record<string, unknown> | null;
}): CollectionOutput<SettingCollection> {
  return { key, value } as CollectionOutput<SettingCollection>;
}

describe(`dictionarySearch hanziCharacterCount`, () => {
  const test = baseTest.extend(rizzleFixture).extend(dbFixture);

  test(`computes hanziCharacterCount for single character entries`, async ({
    db,
  }) => {
    await db.builtInDictionarySearch.preload();
    const entries = db.builtInDictionarySearch.toArray;

    // Find entries with single characters
    const singleCharEntries = entries.filter(
      (e: DictionarySearchEntry) =>
        matchAllHanziCharacters(e.hanzi).length === 1,
    );
    expect(singleCharEntries.length).toBeGreaterThan(0);

    // All single character entries should have hanziCharacterCount of 1
    for (const entry of singleCharEntries) {
      expect(entry.hanziCharacterCount).toBe(1);
    }
  });

  test(`computes hanziCharacterCount for multi-character entries`, async ({
    db,
  }) => {
    await db.builtInDictionarySearch.preload();
    const entries = db.builtInDictionarySearch.toArray;

    // Find entries with multi-character words
    const multiCharEntries = entries.filter(
      (e: DictionarySearchEntry) => matchAllHanziCharacters(e.hanzi).length > 1,
    );
    expect(multiCharEntries.length).toBeGreaterThan(0);

    // Multi-character entries should have hanziCharacterCount matching the number of hanzi characters
    for (const entry of multiCharEntries) {
      expect(entry.hanziCharacterCount).toBe(
        matchAllHanziCharacters(entry.hanzi).length,
      );
    }
  });

  test(`includes hanziCharacterCount in user entries`, async ({
    db,
    rizzle,
  }) => {
    const keyParams = getUserHanziMeaningKeyParams(汉`里`, `u_inside`);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `inside`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    await db.dictionarySearch.preload();
    const userEntries = db.dictionarySearch.toArray.filter(
      (e: DictionarySearchEntry) => e.sourceKind === `user`,
    );

    expect(userEntries.length).toBeGreaterThan(0);
    for (const entry of userEntries) {
      expect(entry.hanziCharacterCount).toBeGreaterThan(0);
    }
  });

  test(`includes hskSortKey for built-in and user entries`, async ({
    db,
    rizzle,
  }) => {
    await db.builtInDictionarySearch.preload();
    const builtInEntry = db.builtInDictionarySearch.toArray.find(
      (e: DictionarySearchEntry) => e.hsk != null,
    );

    expect(builtInEntry).toBeDefined();
    expect(builtInEntry?.hskSortKey).toBeGreaterThan(0);

    const keyParams = getUserHanziMeaningKeyParams(汉`里`, `u_inside`);
    await rizzle.mutate.setSetting({
      key: userHanziMeaningGlossSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningGlossSetting.entity.marshalValue({
        ...keyParams,
        text: `inside`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    await db.dictionarySearch.preload();
    const userEntry = db.dictionarySearch.toArray.find(
      (e: DictionarySearchEntry) => e.sourceKind === `user`,
    );

    expect(userEntry).toBeDefined();
    expect(userEntry?.hskSortKey).toBe(Number.POSITIVE_INFINITY);
  });
});
