import { Rating, UpcomingReview, nextReview } from "#util/fsrs.ts";
import { RepeatedSequence2 } from "#util/types.ts";
import { differenceInMilliseconds } from "date-fns/differenceInMilliseconds";
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

testFsrsSequence([
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
]);

testFsrsSequence([
  Rating.Hard,
  {
    difficulty: 6.3449,
    stability: 1.4436,
    delay: { minutes: 5 },
  },
  Rating.Hard,
  {
    difficulty: 7.13290854,
    stability: 1.44564795,
    delay: { minutes: 5 },
  },
  Rating.Hard,
  {
    difficulty: 7.89239117,
    stability: 1.4473489,
    delay: { minutes: 5 },
  },
]);

testFsrsSequence([
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { days: 4, hours: 3, minutes: 20 },
  },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 15.06698051,
    delay: { days: 15, hours: 1, minutes: 36 },
  },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 48.5160313,
    delay: { days: 17, hours: 12, minutes: 23, months: 1 },
  },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 140.58130087,
    delay: { days: 18, hours: 13, minutes: 57, months: 4 },
  },
]);

testFsrsSequence([
  Rating.Easy,
  {
    difficulty: 3.9437,
    stability: 10.9355,
    delay: { days: 10, hours: 22, minutes: 27 },
  },
  Rating.Easy,
  {
    difficulty: 3.15569146,
    stability: 97.17319159,
    delay: { days: 7, hours: 4, minutes: 9, months: 3 },
  },
  Rating.Easy,
  {
    difficulty: 2.39620883,
    stability: 732.60340194,
    delay: { days: 1, hours: 14, minutes: 29, years: 2 },
  },
]);

testFsrsSequence([
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { days: 4, hours: 3, minutes: 20 },
  },
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 15.06698051,
    delay: { days: 15, hours: 1, minutes: 36 },
  },
  Rating.Hard,
  {
    difficulty: 5.97577026,
    stability: 22.39232263,
    delay: { minutes: 5 },
  },
  Rating.Hard,
  {
    difficulty: 6.7771413,
    stability: 22.3938533,
    delay: { minutes: 5 },
  },
  Rating.Hard,
  {
    difficulty: 7.5495027,
    stability: 22.3951392,
    delay: { minutes: 5 },
  },
]);

testFsrsSequence([
  Rating.Good,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { days: 4, hours: 3, minutes: 20 },
  },
  Rating.Again,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { minutes: 1 },
  },
  Rating.Again,
  {
    difficulty: 5.1443,
    stability: 4.1386,
    delay: { minutes: 1 },
  },
  Rating.Easy,
  {
    difficulty: 4.31282974,
    stability: 4.14436918,
    delay: { days: 4, hours: 3, minutes: 28 },
  },
]);

testFsrsSequence([
  Rating.Again,
  {
    difficulty: 7.5455,
    stability: 0.5701,
    delay: { minutes: 1 },
  },
  Rating.Good,
  {
    difficulty: 7.45857656,
    stability: 0.57167237,
    delay: { hours: 13, minutes: 43 },
  },
  Rating.Good,
  {
    difficulty: 7.37479975,
    stability: 1.76207836,
    delay: { days: 1, hours: 18, minutes: 17 },
  },
  Rating.Good,
  {
    difficulty: 7.29405566,
    stability: 4.99174844,
    delay: { days: 4, hours: 23, minutes: 48 },
  },
  Rating.Good,
  {
    difficulty: 7.21623451,
    stability: 13.12600151,
    delay: { days: 13, hours: 3, minutes: 1 },
  },
]);

type ExpectedReview = z.TypeOf<typeof expectedReviewSchema>;

function ratingName(rating: Rating) {
  return {
    [Rating.Again]: `Again`,
    [Rating.Hard]: `Hard`,
    [Rating.Good]: `Good`,
    [Rating.Easy]: `Easy`,
  }[rating];
}

type FsrsSequence = RepeatedSequence2<[Rating, ExpectedReview]>;

/**
 * Create a test case for an FSRS sequence based on ratings.
 * @param sequence
 */
function testFsrsSequence(sequence: FsrsSequence) {
  const name = sequence
    .flatMap((x) => {
      const rating = ratingSchema.safeParse(x);
      return rating.success ? [ratingName(rating.data)] : [];
    })
    .join(` → `);

  void test(name, assertFsrsSequence(sequence));
}

function assertFsrsSequence(sequence: readonly (ExpectedReview | Rating)[]) {
  return function ({ mock }: TestContext) {
    mock.timers.enable({ apis: [`Date`] });

    let review: UpcomingReview | null = null;

    for (let i = 0; i < sequence.length; i += 2) {
      const rating = ratingSchema.parse(sequence[i + 0]);
      const expectedReview = expectedReviewSchema.parse(sequence[i + 1]);

      const lastReview: UpcomingReview | null = review;
      if (lastReview !== null) {
        mock.timers.tick(differenceInMilliseconds(lastReview.due, new Date()));
      }
      review = nextReview(lastReview, rating);

      if (lastReview !== null) {
        const lastReviewDue: Date = lastReview.due; // HACK: work around TS bug
        assert.deepEqual(review.created, lastReviewDue);
      }

      assert.deepEqual(
        {
          difficulty: review.difficulty,
          stability: review.stability,
          delay: intervalToDuration({ start: review.created, end: review.due }),
        },
        expectedReview,
      );
    }
  };
}
