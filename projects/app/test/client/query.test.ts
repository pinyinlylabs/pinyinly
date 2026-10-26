import type {
  DictionaryCollectionEntry,
  HistoryPageCollection,
  HistoryPageData,
} from "#client/query.js";
import {
  historyPageCollection,
  historyPageData,
  wikiPayloadSchema,
  hanziSvgPathsQueryWeb,
  hanziSvgPathsQueryNative,
  wikiPayloadQueryWeb,
  wikiPayloadQueryNative,
  skipQuery,
} from "#client/query.js";
import { hanziCharacterSchema } from "#data/model.ts";
import type { HanziCharacter, HanziText } from "#data/model.ts";
import { QueryClient, QueryObserver, skipToken } from "@tanstack/react-query";
import { matchAllHanziCharacters } from "#data/hanzi.ts";
import {
  getUserHanziMeaningKeyParams,
  getStudyWordKeyParams,
  studyWordItemSetting,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
} from "#data/userSettings.ts";
import { loadDictionary } from "#dictionary.js";
import { seedSkillReviews, 汉 } from "#test/data/helpers.ts";
import { formatTimeOffset, ratingToEmoji } from "#test/helpers.ts";
import { testWithDb } from "#test/util/rizzleHelpers.ts";
import { nonNullable } from "@pinyinly/lib/invariant";
import {
  afterEach,
  test as unitTest,
  beforeAll,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
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

unitTest(`skipQuery preserves the data type without starting a fetch`, () => {
  const queryClient = new QueryClient();
  const options = skipQuery<{ value: string }>();
  const observer = new QueryObserver(queryClient, options);
  const unsubscribe = observer.subscribe(vi.fn());
  try {
    const result = observer.getCurrentResult();
    expectTypeOf(result.data).toEqualTypeOf<{ value: string } | undefined>();
    expect(options.queryFn).toBe(skipToken);
    expect(result.data).toBeUndefined();
    expect(result.fetchStatus).toBe(`idle`);
    expect(result.isLoading).toBe(false);
    expect(queryClient.isFetching()).toBe(0);
  } finally {
    unsubscribe();
    queryClient.clear();
  }
});

describe(`character asset queries`, () => {
  unitTest.for([hanziSvgPathsQueryWeb, hanziSvgPathsQueryNative])(
    `requires a non-null character`,
    (query) => {
      expectTypeOf(query).parameter(0).toEqualTypeOf<HanziCharacter>();
    },
  );

  unitTest.for([
    hanziSvgPathsQueryWeb,
    hanziSvgPathsQueryNative,
    wikiPayloadQueryWeb,
    wikiPayloadQueryNative,
  ])(`always supplies a query function`, (query) => {
    expect(typeof query(hanziCharacterSchema.parse(`好`)).queryFn).toBe(
      `function`,
    );
  });

  unitTest.for([wikiPayloadQueryWeb, wikiPayloadQueryNative])(
    `requires non-null hanzi`,
    (query) => {
      expectTypeOf(query).parameter(0).toEqualTypeOf<HanziText>();
    },
  );

  unitTest(
    `web queries retain paths, parsed data, and cache keys`,
    async () => {
      const hanzi = hanziCharacterSchema.parse(`好`);
      const strokeData = { strokes: [`path`], medians: [`median`] };
      const wikiData = { visuallySimilar: [hanzi] };
      const fetch = vi
        .spyOn(globalThis, `fetch`)
        .mockResolvedValueOnce(Response.json(strokeData))
        .mockResolvedValueOnce(Response.json(wikiData));
      const queryClient = new QueryClient();
      try {
        const strokeOptions = hanziSvgPathsQueryWeb(hanzi);
        const wikiOptions = wikiPayloadQueryWeb(hanzi);
        expect(await queryClient.query(strokeOptions)).toEqual(strokeData);
        expect(await queryClient.query(wikiOptions)).toEqual(wikiData);
        expect(queryClient.getQueryData([`hanziSvgPaths`, hanzi])).toEqual(
          strokeData,
        );
        expect(queryClient.getQueryData([`wikiPayload`, hanzi])).toEqual(
          wikiData,
        );
        expect(strokeOptions.staleTime).toBe(Infinity);
        expect(wikiOptions.staleTime).toBe(Infinity);
        expect(fetch).toHaveBeenNthCalledWith(
          1,
          `/raw/svgs/${encodeURIComponent(hanzi)}.json`,
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(fetch).toHaveBeenNthCalledWith(
          2,
          `/raw/wiki/${encodeURIComponent(hanzi)}.json`,
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
      } finally {
        fetch.mockRestore();
        queryClient.clear();
      }
    },
  );
});

describe(`wikiPayloadSchema`, () => {
  unitTest(`accepts MDX and optional character examples`, () => {
    expect(
      wikiPayloadSchema.parse({
        mdast: { type: `root`, children: [] },
        curriculumMeanings: [
          {
            id: `兴:interest`,
            gloss: `interest`,
            pinyin: `xìng`,
            description: `To have an interest in something.`,
          },
        ],
        curriculumMeaningExamples: [
          {
            id: `兴:interest`,
            exampleSentence: {
              hanzi: `我对这个话题很感兴趣。`,
              pinyin: `wǒ duì zhège huàtí hěn gǎn xìngqù`,
              translation: `I'm very interested in this topic.`,
            },
          },
        ],
      }),
    ).toMatchObject({
      mdast: { type: `root` },
      curriculumMeanings: [
        { id: `兴:interest`, description: `To have an interest in something.` },
      ],
      curriculumMeaningExamples: [{ id: `兴:interest` }],
    });
  });

  unitTest(`accepts character meanings without an MDX article`, () => {
    expect(
      wikiPayloadSchema.safeParse({
        curriculumMeanings: [
          {
            id: `兴:interest`,
            gloss: `interest`,
            pinyin: `xìng`,
            description: `To have an interest in something.`,
          },
        ],
        curriculumMeaningExamples: [
          {
            id: `兴:interest`,
            exampleSentence: {
              hanzi: `我对这个话题很感兴趣。`,
              pinyin: `wǒ duì zhège huàtí hěn gǎn xìngqù`,
              translation: `I'm very interested in this topic.`,
            },
          },
        ],
      }).success,
    ).toBe(true);
  });

  unitTest(`rejects an empty payload`, () => {
    expect(wikiPayloadSchema.safeParse({}).success).toBe(false);
  });
});

describe(`historyPageCollection suite`, () => {
  const test = testWithDb.extend<{ collection: HistoryPageCollection }>({
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
});

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

describe(`bookmarkedWordsCollection`, () => {
  const test = testWithDb;

  test(`hanziWord field retains existing storage keys and aliases`, () => {
    const createdAt = new Date();
    const keyParams = getStudyWordKeyParams(`你好:hello`);
    expect(studyWordItemSetting.entity.marshalKey(keyParams)).toBe(
      `pwi/你好:hello`,
    );
    expect(studyWordItemSetting.entity.unmarshalKey(`pwi/你好:hello`)).toEqual({
      hanziWord: `你好:hello`,
    });
    expect(
      studyWordItemSetting.decode(keyParams, {
        w: `你好:hello`,
        c: createdAt.toISOString(),
      }),
    ).toEqual({ hanziWord: `你好:hello`, createdAt });
    expect(
      studyWordItemSetting.encodeStoredValue(keyParams, {
        ...keyParams,
        createdAt,
      }),
    ).toEqual({ c: createdAt.toISOString() });
  });

  test(`decodes stripped settings and tracks removal`, async ({
    db,
    rizzle,
  }) => {
    const keyParams = getStudyWordKeyParams(`你好:hello`);
    const key = studyWordItemSetting.entity.marshalKey(keyParams);
    const createdAt = new Date();
    await rizzle.mutate.setSetting({
      key,
      value: studyWordItemSetting.encodeStoredValue(keyParams, {
        ...keyParams,
        createdAt,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.bookmarkedWordsCollection.preload();
    await vi.waitFor(() => {
      expect(db.bookmarkedWordsCollection.toArray).toEqual([
        expect.objectContaining({ ...keyParams, createdAt }),
      ]);
    });
    await rizzle.mutate.setSetting({
      key,
      value: null,
      now: new Date(),
      skipHistory: true,
    });
    await vi.waitFor(() => {
      expect(db.bookmarkedWordsCollection.toArray).toEqual([]);
    });
  });

  test(`decodes legacy full payloads and tracks added-date updates`, async ({
    db,
    rizzle,
  }) => {
    const keyParams = getStudyWordKeyParams(`你好:hello`);
    const key = studyWordItemSetting.entity.marshalKey(keyParams);
    const createdAt = new Date();
    await rizzle.mutate.setSetting({
      key,
      value: studyWordItemSetting.entity.marshalValue({
        ...keyParams,
        createdAt,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.bookmarkedWordsCollection.preload();
    await vi.waitFor(() => {
      expect(db.bookmarkedWordsCollection.toArray).toEqual([
        expect.objectContaining({ ...keyParams, createdAt }),
      ]);
    });
    await rizzle.mutate.setSetting({
      key,
      value: studyWordItemSetting.encodeStoredValue(keyParams, {
        ...keyParams,
        createdAt: new Date(createdAt.getTime() + 1000),
      }),
      now: new Date(),
      skipHistory: true,
    });
    await vi.waitFor(() => {
      expect(db.bookmarkedWordsCollection.toArray).toEqual([
        expect.objectContaining({
          ...keyParams,
          createdAt: new Date(createdAt.getTime() + 1000),
        }),
      ]);
    });
  });

  test(`ignores unrelated and invalid settings`, async ({ db, rizzle }) => {
    for (const key of [
      `userName`,
      studyWordItemSetting.entity.marshalKey({ hanziWord: `你好:hello` }),
      studyWordItemSetting.entity.keyPrefix,
    ]) {
      await rizzle.mutate.setSetting({
        key,
        value: {},
        now: new Date(),
        skipHistory: true,
      });
    }
    await db.bookmarkedWordsCollection.preload();
    expect(db.bookmarkedWordsCollection.toArray).toEqual([]);
  });

  test(`joins exact meanings with dates and excludes legacy character selections`, async ({
    db,
    rizzle,
  }) => {
    const dictionary = await loadDictionary();
    const expected = dictionary.lookupHanzi(汉`好`).map(([word]) => word);
    expect(expected.length).toBeGreaterThan(1);
    const exactWord = nonNullable(expected[0]);
    const createdAt = new Date();
    for (const word of [exactWord, `missing:meaning`] as const) {
      const keyParams = getStudyWordKeyParams(word);
      await rizzle.mutate.setSetting({
        key: studyWordItemSetting.entity.marshalKey(keyParams),
        value: studyWordItemSetting.encodeStoredValue(keyParams, {
          ...keyParams,
          createdAt,
        }),
        now: new Date(),
        skipHistory: true,
      });
    }
    await rizzle.mutate.setSetting({
      key: `${studyWordItemSetting.entity.keyPrefix}好`,
      value: studyWordItemSetting.entity.marshalValue({
        hanziWord: exactWord,
        createdAt: new Date(),
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.bookmarkedHanziWordsCollection.preload();
    await vi.waitFor(() => {
      expect(
        db.bookmarkedHanziWordsCollection.toArray
          .map(({ hanziWord }) => hanziWord)
          .sort(),
      ).toEqual([exactWord]);
      expect(db.bookmarkedHanziWordsCollection.toArray[0]?.createdAt).toEqual(
        createdAt,
      );
    });
    await rizzle.mutate.setSetting({
      key: studyWordItemSetting.entity.marshalKey({ hanziWord: exactWord }),
      value: null,
      now: new Date(),
      skipHistory: true,
    });
    await vi.waitFor(() => {
      expect(
        db.bookmarkedHanziWordsCollection.toArray.map(
          ({ hanziWord }) => hanziWord,
        ),
      ).toEqual([]);
    });
  });

  test(`resolved words track dictionary additions and removals`, async ({
    db,
    rizzle,
  }) => {
    const word = `里:u_priority`;
    const keyParams = getStudyWordKeyParams(word);
    await rizzle.mutate.setSetting({
      key: studyWordItemSetting.entity.marshalKey(keyParams),
      value: studyWordItemSetting.encodeStoredValue(keyParams, {
        ...keyParams,
        createdAt: new Date(),
      }),
      now: new Date(),
      skipHistory: true,
    });
    await db.bookmarkedHanziWordsCollection.preload();
    expect(db.bookmarkedHanziWordsCollection.toArray).toEqual([]);

    const meaningKeyParams = getUserHanziMeaningKeyParams(汉`里`, `u_priority`);
    const key =
      userHanziMeaningGlossSetting.entity.marshalKey(meaningKeyParams);
    await rizzle.mutate.setSetting({
      key,
      value: userHanziMeaningGlossSetting.encodeStoredValue(meaningKeyParams, {
        ...meaningKeyParams,
        text: `inside`,
      }),
      now: new Date(),
      skipHistory: true,
    });
    await vi.waitFor(() => {
      expect(
        db.bookmarkedHanziWordsCollection.toArray.map(
          ({ hanziWord }) => hanziWord,
        ),
      ).toEqual([word]);
    });
    await rizzle.mutate.setSetting({
      key,
      value: null,
      now: new Date(),
      skipHistory: true,
    });
    await vi.waitFor(() => {
      expect(db.bookmarkedHanziWordsCollection.toArray).toEqual([]);
    });
  });
});

describe(`userDictionaryCollectionOptions`, () => {
  const test = testWithDb;

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

    expect(db.userDictionary.get(`好:u_meaningA`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "好:u_meaningA",
        "$origin": "remote",
        "$synced": true,
        "gloss": "good",
        "hanzi": "好",
        "meaningKey": "u_meaningA",
        "note": "common adjective",
        "pinyin": "hǎo",
      }
    `);
    expect(db.userDictionary.get(`好:u_meaningB`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "好:u_meaningB",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to like",
        "hanzi": "好",
        "meaningKey": "u_meaningB",
        "note": undefined,
        "pinyin": undefined,
      }
    `);
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

    expect(db.userDictionary.get(`行:u_walk`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "行:u_walk",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to walk",
        "hanzi": "行",
        "meaningKey": "u_walk",
        "note": undefined,
        "pinyin": undefined,
      }
    `);

    await rizzle.mutate.setSetting({
      key: userHanziMeaningPinyinSetting.entity.marshalKey(keyParams),
      value: userHanziMeaningPinyinSetting.entity.marshalValue({
        ...keyParams,
        text: `xíng`,
      }),
      now: new Date(),
      skipHistory: true,
    });

    expect(db.userDictionary.get(`行:u_walk`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "行:u_walk",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to walk",
        "hanzi": "行",
        "meaningKey": "u_walk",
        "note": undefined,
        "pinyin": "xíng",
      }
    `);
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

    expect(db.userDictionary.get(`行:u_walk`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "行:u_walk",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to walk",
        "hanzi": "行",
        "meaningKey": "u_walk",
        "note": "common verb",
        "pinyin": undefined,
      }
    `);
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

    expect(db.userDictionary.get(`行:u_walk`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "行:u_walk",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to go on foot",
        "hanzi": "行",
        "meaningKey": "u_walk",
        "note": undefined,
        "pinyin": undefined,
      }
    `);
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

    expect(db.userDictionary.get(`行:u_walk`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "行:u_walk",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to walk",
        "hanzi": "行",
        "meaningKey": "u_walk",
        "note": undefined,
        "pinyin": "háng",
      }
    `);
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

    expect(db.userDictionary.get(`行:u_walk`)).toMatchInlineSnapshot(`
      {
        "$collectionId": "userDictionary",
        "$hasPendingWrites": false,
        "$key": "行:u_walk",
        "$origin": "remote",
        "$synced": true,
        "gloss": "to walk",
        "hanzi": "行",
        "meaningKey": "u_walk",
        "note": "HSK 1 verb",
        "pinyin": undefined,
      }
    `);
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

describe(`dictionaryCollection hanziCharacterCount`, () => {
  const test = testWithDb;

  test(`computes hanziCharacterCount for single character entries`, async ({
    db,
  }) => {
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    // Find entries with single characters
    const singleCharEntries = entries.filter(
      (e: DictionaryCollectionEntry) =>
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
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    // Find entries with multi-character words
    const multiCharEntries = entries.filter(
      (e: DictionaryCollectionEntry) =>
        matchAllHanziCharacters(e.hanzi).length > 1,
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

    await db.dictionaryCollection.preload();
    const userEntries = db.dictionaryCollection.toArray.filter(
      (e: DictionaryCollectionEntry) => e.sourceKind === `user`,
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
    await db.builtInDictionaryCollection.preload();
    const builtInEntry = db.builtInDictionaryCollection.toArray.find(
      (e: DictionaryCollectionEntry) => e.hsk != null,
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

    await db.dictionaryCollection.preload();
    const userEntry = db.dictionaryCollection.toArray.find(
      (e: DictionaryCollectionEntry) => e.sourceKind === `user`,
    );

    expect(userEntry).toBeDefined();
    expect(userEntry?.hskSortKey).toBe(9999);
  });

  test(`includes glossCount for built-in entries`, async ({ db }) => {
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.glossCount).toBe(entry.gloss.length);
      expect(entry.glossCount).toBeGreaterThan(0);
    }
  });

  test(`includes glossCount for user entries`, async ({ db, rizzle }) => {
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

    await db.dictionaryCollection.preload();
    const userEntries = db.dictionaryCollection.toArray.filter(
      (e: DictionaryCollectionEntry) => e.sourceKind === `user`,
    );

    expect(userEntries.length).toBeGreaterThan(0);
    for (const entry of userEntries) {
      expect(entry.glossCount).toBe(1);
    }
  });
});

describe(`dictionaryCollection hskFirstAppearance`, () => {
  const test = testWithDb;

  test(`is defined for single-char entries that have an hsk level`, async ({
    db,
  }) => {
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    const singleCharWithHsk = entries.filter(
      (e: DictionaryCollectionEntry) =>
        e.hanziCharacterCount === 1 && e.hsk != null,
    );
    expect(singleCharWithHsk.length).toBeGreaterThan(0);

    for (const entry of singleCharWithHsk) {
      expect(entry.hskFirstAppearance).toBeDefined();
    }
  });

  test(`is lower than hsk when character appears in an earlier-level word`, async ({
    db,
  }) => {
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    // 立 is HSK5 as a standalone word, but appears in 成立 (HSK3), so
    // hskFirstAppearance should be lower than hsk.
    const liEntry = entries.find(
      (e: DictionaryCollectionEntry) => e.hanzi === `立` && e.hsk === `5`,
    );
    expect(liEntry).toBeDefined();
    expect(liEntry?.hskFirstAppearance).toBeDefined();
    expect(Number(liEntry?.hskFirstAppearance)).toBeLessThan(
      Number(liEntry?.hsk),
    );
  });

  test(`equals hsk for multi-character entries`, async ({ db }) => {
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    const multiCharWithHsk = entries.filter(
      (e: DictionaryCollectionEntry) =>
        e.hanziCharacterCount > 1 && e.hsk != null,
    );
    expect(multiCharWithHsk.length).toBeGreaterThan(0);

    for (const entry of multiCharWithHsk) {
      expect(entry.hskFirstAppearance).toBe(entry.hsk);
    }
  });

  test(`is undefined for multi-character entries without hsk`, async ({
    db,
  }) => {
    await db.builtInDictionaryCollection.preload();
    const entries = db.builtInDictionaryCollection.toArray;

    const noHskEntries = entries.filter(
      (e: DictionaryCollectionEntry) =>
        e.hsk == null && e.hanziCharacterCount > 1,
    );

    for (const entry of noHskEntries) {
      expect(entry.hskFirstAppearance, entry.hanzi).toBeUndefined();
    }
  });
});
