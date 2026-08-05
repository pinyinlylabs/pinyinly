import { parseRelativeTimeShorthand, 时 } from "#test/data/helpers.ts";
import {
  Rating,
  fsrsIsForgotten,
  fsrsPredictedRecallProbability,
  nextReview,
} from "#util/fsrs.ts";
import type { FsrsState } from "#util/fsrs.ts";
import type { Duration } from "date-fns";
import { add } from "date-fns/add";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { describe, expect, test, vi } from "vitest";
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

const ratingSchema = z.enum(Rating);

describe(
  `nextReview suite` satisfies HasNameOf<typeof nextReview>,
  async () => {
    test(`stability increases after time elapsed with correct rating`, () => {
      const before = nextReview(null, Rating.Again);
      const afterEasy = nextReview(before, Rating.Easy, 时`+1s`);
      const afterGood = nextReview(before, Rating.Good, 时`+1s`);
      const afterHard = nextReview(before, Rating.Hard, 时`+1s`);

      // .Easy should increase stability
      expect(before.stability).toBeLessThan(afterEasy.stability);

      // .Good should increase stability
      expect(before.stability).toBeLessThan(afterGood.stability);

      // .Hard should increase stability
      expect(before.stability).toBeLessThan(afterHard.stability);
    });

    test(`stability decreases from .Again`, () => {
      const before = nextReview(null, Rating.Good);
      const after = nextReview(
        before,
        Rating.Again,
        parseRelativeTimeShorthand(`+10m`),
      );

      expect(after.stability).toBeLessThan(before.stability);
    });

    test(`difficulty lowers with Easy and increases with Hard`, () => {
      const before = nextReview(null, Rating.Good);
      const afterEasy = nextReview(before, Rating.Easy, 时`+1s`);
      const afterGood = nextReview(before, Rating.Good, 时`+1s`);
      const afterHard = nextReview(before, Rating.Hard, 时`+1s`);

      // .Easy should decrease difficulty
      expect(before.difficulty).toBeGreaterThan(afterEasy.difficulty);
      // .Good should keep the same difficulty
      expect(before.difficulty).toBe(afterGood.difficulty);
      // .Hard should increase difficulty
      expect(before.difficulty).toBeLessThan(afterHard.difficulty);
    });

    test(`regression test: InvariantException: neither stability nor difficulty changed after review`, () => {
      // Presumably some floating point precision issue with these specific numbers,
      // even though the review happened 4 seconds after the previous review.
      const fixture = {
        currentState: {
          prevReviewAt: new Date(`2025-11-15T09:05:49.194Z`),
          difficulty: 1,
          stability: 1368.48336329,
          nextReviewAt: new Date(`2029-08-14T20:41:49.194Z`),
        },
        rating: Rating.Easy,
        now: new Date(`2025-11-15T09:05:53.351Z`),
      };

      expect(() =>
        nextReview(fixture.currentState, fixture.rating, fixture.now),
      ).not.toThrow();
    });
  },
);

test(`Again → Again → Again`, () => {
  assertFsrsSequence([
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
      stability: 0.27798711,
      delay: { minutes: 1 },
    },
    { minutes: 1 },
    Rating.Again,
    {
      difficulty: 7.5455,
      stability: 0.14618223,
      delay: { minutes: 1 },
    },
    { minutes: 1 },
  ]);
});

test(`Hard → Hard → Hard`, () => {
  assertFsrsSequence([
    Rating.Hard,
    {
      difficulty: 6.3449,
      stability: 1.4436,
      delay: { minutes: 5 },
    },
    { minutes: 5 },
    Rating.Hard,
    {
      difficulty: 7.13290854,
      stability: 1.44564795,
      delay: { minutes: 5 },
    },
    { minutes: 5 },
    Rating.Hard,
    {
      difficulty: 7.89239117,
      stability: 1.4473489,
      delay: { minutes: 5 },
    },
    { minutes: 5 },
  ]);
});

test(`Good → Good → Good → Good`, () => {
  assertFsrsSequence([
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
      stability: 15.06698051,
      delay: { days: 15, hours: 1, minutes: 36 },
    },
    { days: 15, hours: 1, minutes: 36 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 48.5160313,
      delay: { days: 17, hours: 12, minutes: 23, months: 1 },
    },
    { days: 17, hours: 12, minutes: 23, months: 1 },
    Rating.Good,
    {
      difficulty: 5.1443,
      stability: 140.58130087,
      delay: { months: 4, days: 18, hours: 13, minutes: 57 },
    },
    { months: 4, days: 18, hours: 13, minutes: 57 },
  ]);
});

test(`Easy → Easy → Easy`, () => {
  assertFsrsSequence([
    Rating.Easy,
    {
      difficulty: 3.9437,
      stability: 10.9355,
      delay: { days: 10, hours: 22, minutes: 27 },
    },
    { days: 10, hours: 22, minutes: 27 },
    Rating.Easy,
    {
      difficulty: 3.15569146,
      stability: 97.17319159,
      delay: { months: 3, days: 7, hours: 4, minutes: 9 },
    },
    { months: 3, days: 7, hours: 4, minutes: 9 },
    Rating.Easy,
    {
      difficulty: 2.39620883,
      stability: 732.60340194,
      delay: { years: 2, days: 1, hours: 14, minutes: 29 },
    },
    { years: 2, days: 1, hours: 14, minutes: 29 },
  ]);
});

test(`Good → Good → Hard → Hard → Hard`, () => {
  assertFsrsSequence([
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
      stability: 15.06698051,
      delay: { days: 15, hours: 1, minutes: 36 },
    },
    { days: 15, hours: 1, minutes: 36 },
    Rating.Hard,
    {
      difficulty: 5.97577026,
      stability: 22.39232263,
      delay: { minutes: 5 },
    },
    { minutes: 5 },
    Rating.Hard,
    {
      difficulty: 6.7771413,
      stability: 22.3938533,
      delay: { minutes: 5 },
    },
    { minutes: 5 },
    Rating.Hard,
    {
      difficulty: 7.5495027,
      stability: 22.3951392,
      delay: { minutes: 5 },
    },
    { minutes: 5 },
  ]);
});

test(`Good → Again → Again → Easy → Easy`, () => {
  assertFsrsSequence([
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
      stability: 1.47363235,
      delay: { minutes: 1 },
    },
    { minutes: 1 },
    Rating.Again,
    {
      difficulty: 5.1443,
      stability: 0.62138934,
      delay: { minutes: 1 },
    },
    { minutes: 1 },
    Rating.Easy,
    {
      difficulty: 4.31282974,
      stability: 0.62882935,
      delay: { hours: 15, minutes: 6 },
    },
    { hours: 15, minutes: 6 },
    Rating.Easy,
    {
      difficulty: 3.5114587,
      stability: 7.5267478,
      delay: {
        days: 7,
        hours: 12,
        minutes: 39,
      },
    },
    {
      months: 1,
      days: 8,
      hours: 10,
      minutes: 13,
    },
  ]);
});

test(`Again → Good → Good → Good → Good`, () => {
  assertFsrsSequence([
    Rating.Again,
    {
      difficulty: 7.5455,
      stability: 0.5701,
      delay: { minutes: 1 },
    },
    { minutes: 1 },
    Rating.Good,
    {
      difficulty: 7.45857656,
      stability: 0.57167237,
      delay: { hours: 13, minutes: 43 },
    },
    { hours: 13, minutes: 43 },
    Rating.Good,
    {
      difficulty: 7.37479975,
      stability: 1.76207836,
      delay: { days: 1, hours: 18, minutes: 17 },
    },
    { days: 1, hours: 18, minutes: 17 },
    Rating.Good,
    {
      difficulty: 7.29405566,
      stability: 4.99174844,
      delay: { days: 4, hours: 23, minutes: 48 },
    },
    { days: 4, hours: 23, minutes: 48 },
    Rating.Good,
    {
      difficulty: 7.21623451,
      stability: 13.12600151,
      delay: { days: 13, hours: 3, minutes: 1 },
    },
    { days: 13, hours: 3, minutes: 1 },
  ]);
});

describe(`Again should drop stability`, async () => {
  test(`Good → Good → Good → Again`, () => {
    assertFsrsSequence([
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
        stability: 4.14881398,
        delay: { days: 4, hours: 3, minutes: 34 },
      },
      { minutes: 5 },
      Rating.Good,
      {
        difficulty: 5.1443,
        stability: 4.15902481,
        delay: { days: 4, hours: 3, minutes: 49 },
      },
      { minutes: 5 },
      Rating.Again,
      {
        difficulty: 5.1443,
        stability: 1.27662105,
        delay: { minutes: 1 },
      },
      { minutes: 5 },
    ]);
  });
});

describe(`reviewing before due`, async () => {
  test(`Good → Good → Good → Good → Good → Good`, () => {
    assertFsrsSequence([
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
        stability: 5.90783247,
        delay: { days: 5, hours: 21, minutes: 47 },
      },
      { days: 6, minutes: 50, seconds: 59 },
      Rating.Good,
      {
        difficulty: 5.1443,
        stability: 21.06763655,
        delay: { days: 21, hours: 1, minutes: 37 },
      },
      { days: 7, hours: 13, minutes: 18, seconds: 44 },
      Rating.Good,
      {
        difficulty: 5.1443,
        stability: 38.2226506,
        delay: { months: 1, days: 7, hours: 5, minutes: 21 },
      },
      { seconds: 20 },
      Rating.Good,
      {
        difficulty: 5.1443,
        stability: 38.22315576,
        delay: { months: 1, days: 7, hours: 5, minutes: 21 },
      },
      { seconds: 32 },
      Rating.Good,
      {
        difficulty: 5.1443,
        stability: 38.22396687,
        delay: { months: 1, days: 7, hours: 5, minutes: 23 },
      },
      { minutes: 20 },
    ]);
  });

  // Reviewing the same skill repeatedly shouldn't push its scheduled review
  // date by a large amount, and it shouldn't increase the stability much either
  // because learning takes time, it can't be crammed.
  test(`Good → Good → Good`, () => {
    assertFsrsSequence([
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
        stability: 4.14881398,
        delay: { days: 4, hours: 3, minutes: 34 },
      },
      { minutes: 5 },
      Rating.Good,
      {
        difficulty: 5.1443,
        stability: 4.15902481,
        delay: { days: 4, hours: 3, minutes: 49 },
      },
      { minutes: 5 },
    ]);
  });
});

describe(
  `fsrsPredictedRecallProbability suite` satisfies HasNameOf<
    typeof fsrsPredictedRecallProbability
  >,
  async () => {
    test(`decreases as days elapsed increases (memories fade with time)`, () => {
      const srsState = nextReview(null, Rating.Good);

      for (let i = 1; i < 100; i++) {
        expect(
          fsrsPredictedRecallProbability(
            srsState,
            parseRelativeTimeShorthand(`+${i}d`),
          ),
        ).toBeLessThan(
          fsrsPredictedRecallProbability(
            srsState,
            parseRelativeTimeShorthand(`+${i - 1}d`),
          ),
        );
      }
    });
  },
);

describe(
  `fsrsIsForgotten suite` satisfies HasNameOf<typeof fsrsIsForgotten>,
  async () => {
    test(`is "forgotten" if waited more than ~3 weeks after a single "good" review`, () => {
      vi.useFakeTimers({ toFake: [`Date`] });

      const srsState = nextReview(null, Rating.Good);

      expect(fsrsIsForgotten(srsState)).toBe(false);
      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 1);
      expect(fsrsIsForgotten(srsState)).toBe(false); // after 1 day
      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 18);
      expect(fsrsIsForgotten(srsState)).toBe(false); // after 19 days
      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 1);
      expect(fsrsIsForgotten(srsState)).toBe(true); // after 20 days
    });

    test(`not "forgotten" within a few days of being introduced, regardless of probability`, () => {
      vi.useFakeTimers({ toFake: [`Date`] });

      let srsState = nextReview(null, Rating.Hard);
      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 1); // after 1 days
      srsState = nextReview(srsState, Rating.Again);
      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 4); // after 5 days

      // The probability of recall should be very low.
      expect(fsrsPredictedRecallProbability(srsState)).toBeLessThan(0.01);

      // But it shouldn't be considered "forgotten" yet.
      expect(fsrsIsForgotten(srsState)).toBe(false);
    });
  },
);

type ExpectedReview = z.output<typeof expectedReviewSchema>;

function assertFsrsSequence(
  sequence: readonly (ExpectedReview | Rating | Duration)[],
) {
  return function () {
    vi.useFakeTimers({
      toFake: [`Date`],
    });

    let review: FsrsState | null = null;

    for (let i = 0; i < sequence.length; i += 3) {
      const rating = ratingSchema.parse(sequence[i + 0]);
      const expectedReview = expectedReviewSchema.parse(sequence[i + 1]);
      const waitDuration = sequence[i + 2]! as Duration;

      const lastReview: FsrsState | null = review;
      review = nextReview(lastReview, rating);

      expect({
        difficulty: review.difficulty,
        stability: review.stability,
        delay: intervalToDuration({
          start: review.prevReviewAt,
          end: review.nextReviewAt,
        }),
      }).toEqual(expectedReview);

      // Use .setTime() instead of .tick() to avoid differences in calculations
      // between date-fns and node.js when deciding how to move forward in time.
      // There was a bug previously that this avoids.
      vi.useFakeTimers({ now: add(new Date(), waitDuration).getTime() });
      // mock.timers.setTime(add(new Date(), waitDuration).getTime());
    }
  };
}
