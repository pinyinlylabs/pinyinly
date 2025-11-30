import type {
  Db,
  HistoryPageCollection,
  HistoryPageData,
} from "#client/query.js";
import {
  historyPageCollection,
  historyPageData,
  historyPageQuery,
  makeDb,
} from "#client/query.js";
import type { Rizzle } from "#data/rizzleSchema.js";
import { loadDictionary } from "#dictionary/dictionary.js";
import { IS_CI } from "#util/env.js";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeAll, beforeEach, describe, expect, vi } from "vitest";
import { seedSkillReviews } from "../data/helpers";
import { formatTimeOffset, ratingToEmoji } from "../helpers";
import { rizzleTest } from "../util/rizzleHelpers";

const baseTest = rizzleTest.extend<{ queryClient: QueryClient }>({
  queryClient: [
    async ({}, use) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            throwOnError: true,
            retry: !IS_CI,
          },
        },
      });

      await use(queryClient);
    },
    { scope: `test` },
  ],
});

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
  `historyPageQuery suite` satisfies HasNameOf<typeof historyPageQuery>,
  () => {
    const _QueryDataFn = () =>
      (0 as unknown as QueryClient).fetchQuery(
        historyPageQuery(0 as unknown as Rizzle),
      );
    type QueryData = Awaited<ReturnType<typeof _QueryDataFn>>;
    type Query = ReturnType<typeof historyPageQuery>;

    const queryTest = baseTest.extend<{ query: Query }>({
      query: [
        async ({ rizzle }, use) => {
          const query = historyPageQuery(rizzle);
          await use(query);
        },
        { scope: `test` },
      ],
    });

    function prettyData(data: QueryData): string {
      return data
        .map(
          (session) =>
            `Session ${formatTimeOffset(session.startTime)}-${formatTimeOffset(session.endTime)}:\n${session.groups
              .map(
                (skillGroup) =>
                  `${skillGroup.skill}: ${skillGroup.ratings
                    .map(
                      (rating) =>
                        `${ratingToEmoji(rating.rating)} ${formatTimeOffset(rating.createdAt)}`,
                    )
                    .join(`, `)}`,
              )
              .join(`\n`)}`,
        )
        .join(`\n---\n`);
    }

    queryTest(
      `groups into "sessions" when ratings are less than 5 minutes apart`,
      async ({ rizzle, queryClient, query }) => {
        await seedSkillReviews(rizzle, [
          `❌ he:刀:knife`,
          `💤 5s`,
          `🟡 he:丿:slash`,
          `💤 6m`,
          `🟡 he:𠃌:radical`,
        ]);

        const result = await queryClient.fetchQuery(query);

        expect(prettyData(result)).toMatchInlineSnapshot(`
          "Session 00:06:05-00:06:05:
          he:𠃌:radical: 🟡 00:06:05
          ---
          Session 00:00:00-00:00:05:
          he:丿:slash: 🟡 00:00:05
          he:刀:knife: ❌ 00:00:00"
        `);
      },
    );

    queryTest(
      `groups sequential ratings for the same skill within a session`,
      async ({ rizzle, queryClient, query }) => {
        await seedSkillReviews(rizzle, [
          `❌ he:刀:knife`,
          `💤 5s`,
          `🟡 he:刀:knife`,
          `💤 10s`,
          `🟢 he:刀:knife`,
          `💤 6m`,
          `🟡 he:丿:slash`,
        ]);

        const result = await queryClient.fetchQuery(query);

        expect(prettyData(result)).toMatchInlineSnapshot(`
          "Session 00:06:15-00:06:15:
          he:丿:slash: 🟡 00:06:15
          ---
          Session 00:00:00-00:00:15:
          he:刀:knife: 🟢 00:00:15, 🟡 00:00:05, ❌ 00:00:00"
        `);
      },
    );

    queryTest(
      `groups only sequential ratings for the same skill, creating separate groups for non-sequential occurrences`,
      async ({ rizzle, queryClient, query }) => {
        await seedSkillReviews(rizzle, [
          `❌ he:刀:knife`,
          `💤 5s`,
          `🟡 he:刀:knife`,
          `💤 10s`,
          `🟡 he:丿:slash`,
          `💤 15s`,
          `🟢 he:刀:knife`, // Different group since it's not sequential
          `💤 6m`,
          `🟡 he:𠃌:radical`,
        ]);

        const result = await queryClient.fetchQuery(query);

        expect(prettyData(result)).toMatchInlineSnapshot(`
          "Session 00:06:30-00:06:30:
          he:𠃌:radical: 🟡 00:06:30
          ---
          Session 00:00:00-00:00:30:
          he:刀:knife: 🟢 00:00:30
          he:丿:slash: 🟡 00:00:15
          he:刀:knife: 🟡 00:00:05, ❌ 00:00:00"
        `);
      },
    );
  },
);

describe(
  `historyPageCollection suite` satisfies HasNameOf<
    typeof historyPageCollection
  >,
  () => {
    const dbTest = baseTest.extend<{
      db: Db;
    }>({
      db: [
        async ({ rizzle }, use) => {
          const db = makeDb(rizzle);
          await use(db);
        },
        { scope: `test` },
      ],
    });

    const collectionTest = dbTest.extend<{
      collection: HistoryPageCollection;
    }>({
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

    collectionTest(
      `groups together sequential ratings for the same skill`,
      async ({ collection, rizzle }) => {
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
      },
    );

    collectionTest(
      `uses mistakes at the same time and skill`,
      async ({ collection, rizzle }) => {
        await seedSkillReviews(rizzle, [
          `❌ he:刀:knife`,
          `❌hanziGloss 刀:knife foo`,
          `❌hanziGloss 我:i baz`,
          `💤 1m`,
          `❌ hpi:刀:knife`,
          `❌hanziPinyin 刀:knife pié`,
          `❌hanziPinyin 我:i bǎo`,
        ]);

        await collection.preload();

        const result = historyPageData(collection.toArray);

        expect(prettyData(result)).toMatchInlineSnapshot(`
          "Session 00:00:00-00:01:00:
          hpi:刀:knife: ❌(pié) 00:01:00
          he:刀:knife: ❌(foo) 00:00:00"
        `);
      },
    );

    collectionTest(
      `supports "hanzi" values in hanziOrHanziWord mistakes`,
      async ({ collection, rizzle }) => {
        await seedSkillReviews(rizzle, [
          // Different ordering of rows doesn't matter
          `❌ he:刀:knife`,
          `❌hanziGloss 我 baz`,
          `❌hanziGloss 刀狗 baz`,
          `❌hanziGloss 刀 foo`,
          `💤 1m`,
          `❌ he:刀:knife`,
          `❌hanziGloss 刀狗 baz`,
          `❌hanziGloss 刀 foo`,
          `❌hanziGloss 我 baz`,
          `💤 1m`,
          `❌ hpi:刀:knife`,
          `❌hanziPinyin 我 bǎo`,
          `❌hanziPinyin 刀 pié`,
          `❌hanziPinyin 刀狗 wǒ`,
          `💤 1m`,
          `❌ hpi:刀:knife`,
          `❌hanziPinyin 刀狗 wǒ`,
          `❌hanziPinyin 刀 pié`,
          `❌hanziPinyin 我 bǎo`,
          `💤 1m`,
          // Supports two-character words
          `❌ he:里边:inside`,
          `❌hanziGloss 我 baz`,
          `❌hanziGloss 里边狗 baz`,
          `❌hanziGloss 里边 foo`,
        ]);

        await collection.preload();

        const result = historyPageData(collection.toArray);

        expect(prettyData(result)).toMatchInlineSnapshot(`
          "Session 00:00:00-00:04:00:
          he:里边:inside: ❌(foo) 00:04:00
          hpi:刀:knife: ❌(pié) 00:03:00, ❌(pié) 00:02:00
          he:刀:knife: ❌(foo) 00:01:00, ❌(foo) 00:00:00"
        `);
      },
    );
  },
);
