import type {
  CollectionOutput,
  HistoryPageCollection,
  HistoryPageData,
  SettingCollection,
} from "#client/query.js";
import {
  getPrioritizedHanziWords,
  historyPageCollection,
  historyPageData,
} from "#client/query.js";
import { loadDictionary } from "#dictionary.js";
import { seedSkillReviews } from "#test/data/helpers.ts";
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

describe(
  `getPrioritizedHanziWords suite` satisfies HasNameOf<
    typeof getPrioritizedHanziWords
  >,
  () => {
    baseTest(`reads prioritized words from value payload`, () => {
      const result = getPrioritizedHanziWords([
        settingRow({ key: `pwi/你好:hello`, value: { w: `你好:hello` } }),
      ]);

      expect(result).toEqual([`你好:hello`]);
    });

    baseTest(`falls back to key when payload omits word field`, () => {
      // useUserSetting strips key params from setting values, so `w` may be absent.
      const result = getPrioritizedHanziWords([
        settingRow({
          key: `pwi/你好:hello`,
          value: { c: new Date().toISOString() },
        }),
      ]);

      expect(result).toEqual([`你好:hello`]);
    });

    baseTest(`filters unrelated keys and deduplicates words`, () => {
      const result = getPrioritizedHanziWords([
        settingRow({ key: `pwi/你好:hello`, value: { w: `你好:hello` } }),
        settingRow({ key: `userName`, value: { t: `Brad` } }),
        settingRow({
          key: `pwi/你好:hello`,
          value: { c: new Date().toISOString() },
        }),
        settingRow({ key: `pwi/再见:goodbye`, value: { w: `再见:goodbye` } }),
      ]);

      expect(result).toEqual([`你好:hello`, `再见:goodbye`]);
    });
  },
);

function settingRow({
  key,
  value,
}: {
  key: string;
  value: Record<string, unknown> | null;
}): CollectionOutput<SettingCollection> {
  return { key, value } as CollectionOutput<SettingCollection>;
}
