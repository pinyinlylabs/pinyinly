import { historyPageQuery } from "#client/query.js";
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

describe(
  `historyPageQuery suite` satisfies HasNameOf<typeof historyPageQuery>,
  () => {
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
