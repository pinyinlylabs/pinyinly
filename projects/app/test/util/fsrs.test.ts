import {
  FsrsState,
  Rating,
  fsrsIsIntroduced,
  nextReview,
  ratingName,
} from "#util/fsrs.ts";
import { RepeatedSequence2 } from "#util/types.ts";
import { parseRelativeTimeShorthand } from "../data/helpers";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type { Duration } from "date-fns";
import { add } from "date-fns/add";
import { intervalToDuration } from "date-fns/intervalToDuration";
import assert from "node:assert/strict";
import test, { TestContext } from "node:test";
import z from "zod";

const expectedReviewSchema = z.object({
  stability: z.number(),
  difficulty: z.number(),
  delay: z
    .object({
      years: z.number(),
      months: z.number(),
      weeks: z.number(),
      days: z.number(),
      hours: z.number(),
      minutes: z.number(),
      seconds: z.number(),
    })
    .partial(),
});

const ratingSchema = z.nativeEnum(Rating);

await test(`${nextReview.name} suite`, async () => {
  await test(`stability increases after time elapsed with correct rating`, () => {
    const before = nextReview(null, Rating.Again);
    const afterEasy = nextReview(
      before,
      Rating.Easy,
      parseRelativeTimeShorthand(`+1s`),
    );
    const afterGood = nextReview(
      before,
      Rating.Good,
      parseRelativeTimeShorthand(`+1s`),
    );
    const afterHard = nextReview(
      before,
      Rating.Hard,
      parseRelativeTimeShorthand(`+1s`),
    );

    assert.ok(
      before.stability < afterEasy.stability,
      `.Easy should increase stability`,
    );
    assert.ok(
      before.stability < afterGood.stability,
      `.Good should increase stability`,
    );
    assert.ok(
      before.stability < afterHard.stability,
      `.Hard should increase stability`,
    );
  });

  await test(`stability does not decrease from .Again`, () => {
    const before = nextReview(null, Rating.Good);
    const after = nextReview(
      before,
      Rating.Again,
      parseRelativeTimeShorthand(`+10m`),
    );

    assert.ok(after.stability === before.stability);
  });

  await test(`difficulty lowers with Easy and increases with Hard`, () => {
    const before = nextReview(null, Rating.Good);
    const afterEasy = nextReview(
      before,
      Rating.Easy,
      parseRelativeTimeShorthand(`+1s`),
    );
    const afterGood = nextReview(
      before,
      Rating.Good,
      parseRelativeTimeShorthand(`+1s`),
    );
    const afterHard = nextReview(
      before,
      Rating.Hard,
      parseRelativeTimeShorthand(`+1s`),
    );

    assert.ok(
      before.difficulty > afterEasy.difficulty,
      `.Easy should decrease difficulty`,
    );
    assert.ok(
      before.difficulty === afterGood.difficulty,
      `.Good should keep the same difficulty`,
    );
    assert.ok(
      before.difficulty < afterHard.difficulty,
      `.Hard should increase difficulty`,
    );
  });
});

await testFsrsSequence(`Again → Again → Again`, [
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  { minutes: 1 },
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  { minutes: 1 },
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  { minutes: 1 },
]);

await testFsrsSequence(`Hard → Hard → Hard`, [
  Rating.Hard,
  {
    difficulty: 6.3449,
    stability: 1.4436,
    delay: { minutes: 5 },
  },
  { minutes: 5 },
  Rating.Hard,
  {
    difficulty: 7.132_908_54,
    stability: 1.445_647_95,
    delay: { minutes: 5 },
  },
  { minutes: 5 },
  Rating.Hard,
  {
    difficulty: 7.892_391_17,
    stability: 1.447_348_9,
    delay: { minutes: 5 },
  },
  { minutes: 5 },
]);

await testFsrsSequence(`Good → Good → Good → Good`, [
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { days: 4, hours: 3, minutes: 20 },
  },
  { days: 4, hours: 3, minutes: 20 },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 15.066_980_51,
    delay: { days: 15, hours: 1, minutes: 36 },
  },
  { days: 15, hours: 1, minutes: 36 },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 48.516_031_3,
    delay: { days: 17, hours: 12, minutes: 23, months: 1 },
  },
  { days: 17, hours: 12, minutes: 23, months: 1 },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 140.581_300_87,
    delay: { months: 4, days: 18, hours: 13, minutes: 57 },
  },
  { months: 4, days: 18, hours: 13, minutes: 57 },
]);

await testFsrsSequence(`Easy → Easy → Easy`, [
  Rating.Easy,
  {
    difficulty: 3.9437,
    stability: 10.9355,
    delay: { days: 10, hours: 22, minutes: 27 },
  },
  { days: 10, hours: 22, minutes: 27 },
  Rating.Easy,
  {
    difficulty: 3.155_691_46,
    stability: 97.173_191_59,
    delay: { months: 3, days: 7, hours: 4, minutes: 9 },
  },
  { months: 3, days: 7, hours: 4, minutes: 9 },
  Rating.Easy,
  {
    difficulty: 2.396_208_83,
    stability: 732.603_401_94,
    delay: { years: 2, days: 1, hours: 14, minutes: 29 },
  },
  { years: 2, days: 1, hours: 14, minutes: 29 },
]);

await testFsrsSequence(`Good → Good → Hard → Hard → Hard`, [
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { days: 4, hours: 3, minutes: 20 },
  },
  { days: 4, hours: 3, minutes: 20 },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 15.066_980_51,
    delay: { days: 15, hours: 1, minutes: 36 },
  },
  { days: 15, hours: 1, minutes: 36 },
  Rating.Hard,
  {
    difficulty: 5.975_770_26,
    stability: 22.392_322_63,
    delay: { minutes: 5 },
  },
  { minutes: 5 },
  Rating.Hard,
  {
    difficulty: 6.777_141_3,
    stability: 22.393_853_3,
    delay: { minutes: 5 },
  },
  { minutes: 5 },
  Rating.Hard,
  {
    difficulty: 7.549_502_7,
    stability: 22.395_139_2,
    delay: { minutes: 5 },
  },
  { minutes: 5 },
]);

await testFsrsSequence(`Good → Again → Again → Easy → Easy`, [
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { days: 4, hours: 3, minutes: 20 },
  },
  { days: 4, hours: 3, minutes: 20 },
  Rating.Again,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { minutes: 1 },
  },
  { minutes: 1 },
  Rating.Again,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { minutes: 1 },
  },
  { minutes: 1 },
  Rating.Easy,
  {
    difficulty: 4.312_829_74,
    stability: 4.144_369_18,
    delay: { days: 4, hours: 3, minutes: 28 },
  },
  { days: 4, hours: 3, minutes: 28 },
  Rating.Easy,
  {
    difficulty: 3.511_458_7,
    stability: 39.425_421_47,
    delay: {
      months: 1,
      days: 8,
      hours: 10,
      minutes: 13,
    },
  },
  {
    months: 1,
    days: 8,
    hours: 10,
    minutes: 13,
  },
]);

await testFsrsSequence(`Again → Good → Good → Good → Good`, [
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  { minutes: 1 },
  Rating.Good,
  {
    difficulty: 7.458_576_56,
    stability: 0.571_672_37,
    delay: { hours: 13, minutes: 43 },
  },
  { hours: 13, minutes: 43 },
  Rating.Good,
  {
    difficulty: 7.374_799_75,
    stability: 1.762_078_36,
    delay: { days: 1, hours: 18, minutes: 17 },
  },
  { days: 1, hours: 18, minutes: 17 },
  Rating.Good,
  {
    difficulty: 7.294_055_66,
    stability: 4.991_748_44,
    delay: { days: 4, hours: 23, minutes: 48 },
  },
  { days: 4, hours: 23, minutes: 48 },
  Rating.Good,
  {
    difficulty: 7.216_234_51,
    stability: 13.126_001_51,
    delay: { days: 13, hours: 3, minutes: 1 },
  },
  { days: 13, hours: 3, minutes: 1 },
]);

await test(`reviewing before due`, async () => {
  await testFsrsSequence(`Good → Good → Good → Good → Good → Good`, [
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 4.1386,
      delay: { days: 4, hours: 3, minutes: 20 },
    },
    { hours: 14, minutes: 40, seconds: 48 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 5.907_832_47,
      delay: { days: 5, hours: 21, minutes: 47 },
    },
    { days: 6, minutes: 50, seconds: 59 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 21.067_636_55,
      delay: { days: 21, hours: 1, minutes: 37 },
    },
    { days: 7, hours: 13, minutes: 18, seconds: 44 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 38.222_650_6,
      delay: { months: 1, days: 7, hours: 5, minutes: 21 },
    },
    { seconds: 20 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 38.223_155_76,
      delay: { months: 1, days: 7, hours: 5, minutes: 21 },
    },
    { seconds: 32 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 38.223_966_87,
      delay: { months: 1, days: 7, hours: 5, minutes: 23 },
    },
    { minutes: 20 },
  ]);

  // Reviewing the same skill repeatedly shouldn't push its scheduled review
  // date by a large amount, and it shouldn't increase the stability much either
  // because learning takes time, it can't be crammed.
  await testFsrsSequence(`Good → Good → Good`, [
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 4.1386,
      delay: { days: 4, hours: 3, minutes: 20 },
    },
    { minutes: 5 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 4.148_813_98,
      delay: { days: 4, hours: 3, minutes: 34 },
    },
    { minutes: 5 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 4.159_024_81,
      delay: { days: 4, hours: 3, minutes: 49 },
    },
    { minutes: 5 },
  ]);
});

await test(`${fsrsIsIntroduced.name} suite`, async () => {
  await test(`treats Again → Good as introduced`, ({ mock }) => {
    mock.timers.enable({ apis: [`Date`] });
    let state = nextReview(null, Rating.Again);
    mock.timers.tick(5000);
    state = nextReview(state, Rating.Good);

    assert.equal(fsrsIsIntroduced(state), true);
  });

  await test(`treats Again → Again → Good as introduced`, ({ mock }) => {
    mock.timers.enable({ apis: [`Date`] });
    let state = nextReview(null, Rating.Again);
    mock.timers.tick(5000);
    state = nextReview(state, Rating.Again);
    mock.timers.tick(5000);
    state = nextReview(state, Rating.Good);

    assert.equal(fsrsIsIntroduced(state), true);
  });

  await test(`treats Again as not introduced`, () => {
    const state = nextReview(null, Rating.Again);

    assert.equal(fsrsIsIntroduced(state), false);
  });
});

type ExpectedReview = z.TypeOf<typeof expectedReviewSchema>;

type FsrsSequence = RepeatedSequence2<[Rating, ExpectedReview, Duration]>;

/**
 * Create a test case for an FSRS sequence based on ratings.
 * @param sequence
 */
async function testFsrsSequence(name: string, sequence: FsrsSequence) {
  const expectedName = sequence
    .flatMap((x) => {
      const rating = ratingSchema.safeParse(x);
      return rating.success ? [ratingName(rating.data)] : [];
    })
    .join(` → `);

  assert.equal(name, expectedName, `wrong name for test case`);

  await test(name, assertFsrsSequence(sequence));
}

function assertFsrsSequence(
  sequence: readonly (ExpectedReview | Rating | Duration)[],
) {
  return function ({ mock }: TestContext) {
    mock.timers.enable({ apis: [`Date`] });

    let review: FsrsState | null = null;

    for (let i = 0; i < sequence.length; i += 3) {
      const rating = ratingSchema.parse(sequence[i + 0]);
      const expectedReview = expectedReviewSchema.parse(sequence[i + 1]);
      const waitDuration = sequence[i + 2]! as Duration;

      const lastReview: FsrsState | null = review;
      review = nextReview(lastReview, rating);

      assert.deepEqual(
        {
          difficulty: review.difficulty,
          stability: review.stability,
          delay: intervalToDuration({
            start: review.prevReviewAt,
            end: review.nextReviewAt,
          }),
        },
        expectedReview,
      );

      // Use .setTime() instead of .tick() to avoid differences in calculations
      // between date-fns and node.js when deciding how to move forward in time.
      // There was a bug previously that this avoids.
      mock.timers.setTime(add(new Date(), waitDuration).getTime());
    }
  };
}
