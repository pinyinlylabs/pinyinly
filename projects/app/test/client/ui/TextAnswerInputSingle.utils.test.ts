import { describe, expect, test } from "vitest";
import { ratingToInputState } from "#client/ui/TextAnswerInputSingle.utils.ts";
import { RatingReason } from "#client/ui/QuizDeckRatingReason.ts";

describe(`ratingToInputState`, () => {
  describe(`when user answer is empty`, () => {
    test(`returns 'default' when answer is empty and rating is undefined`, () => {
      expect(ratingToInputState(true, null)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Easy`, () => {
      expect(ratingToInputState(true, RatingReason.Perfect)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Good`, () => {
      expect(ratingToInputState(true, RatingReason.Good)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Hard`, () => {
      expect(ratingToInputState(true, RatingReason.Slow)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Again`, () => {
      expect(ratingToInputState(true, RatingReason.Incorrect)).toBe(`default`);
    });
  });

  describe(`when rating is undefined`, () => {
    test(`returns 'default' when rating is undefined and answer is not empty`, () => {
      expect(ratingToInputState(false, null)).toBe(`default`);
    });
  });

  describe(`when user answer is provided and rating is defined`, () => {
    test(`returns 'success' for Rating.Easy`, () => {
      expect(ratingToInputState(false, RatingReason.Perfect)).toBe(`success`);
    });

    test(`returns 'success' for Rating.Good`, () => {
      expect(ratingToInputState(false, RatingReason.Good)).toBe(`success`);
    });

    test(`returns 'warning' for Rating.Hard`, () => {
      expect(ratingToInputState(false, RatingReason.Slow)).toBe(`warning`);
    });

    test(`returns 'error' for Rating.Again`, () => {
      expect(ratingToInputState(false, RatingReason.Incorrect)).toBe(`error`);
    });
  });
});
