import { Rating } from "#util/fsrs.ts";
import {
  RatingReason,
  ratingToReason,
} from "#client/ui/QuizDeckRatingReason.ts";
import { describe, expect, test } from "vitest";

describe(`ratingToReason`, () => {
  test(`coerces Hard to Good when Too slow is hidden`, () => {
    expect(ratingToReason(Rating.Hard, false)).toBe(RatingReason.Good);
  });

  test(`keeps Hard as Slow when Too slow is enabled`, () => {
    expect(ratingToReason(Rating.Hard, true)).toBe(RatingReason.Slow);
  });

  test(`maps Easy, Good, and Again`, () => {
    expect(ratingToReason(Rating.Easy, false)).toBe(RatingReason.Perfect);
    expect(ratingToReason(Rating.Good, false)).toBe(RatingReason.Good);
    expect(ratingToReason(Rating.Again, false)).toBe(RatingReason.Incorrect);
  });
});
