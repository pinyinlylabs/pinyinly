import { Rating } from "#util/fsrs.ts";
import { describe, expect, test } from "vitest";
import { ratingToInputState } from "#client/ui/TextAnswerInputSingle.utils.ts";

describe(`ratingToInputState`, () => {
  describe(`when user answer is empty`, () => {
    test(`returns 'default' when answer is empty and rating is undefined`, () => {
      expect(ratingToInputState(true, undefined)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Easy`, () => {
      expect(ratingToInputState(true, Rating.Easy)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Good`, () => {
      expect(ratingToInputState(true, Rating.Good)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Hard`, () => {
      expect(ratingToInputState(true, Rating.Hard)).toBe(`default`);
    });

    test(`returns 'default' when answer is empty and rating is Again`, () => {
      expect(ratingToInputState(true, Rating.Again)).toBe(`default`);
    });
  });

  describe(`when rating is undefined`, () => {
    test(`returns 'default' when rating is undefined and answer is not empty`, () => {
      expect(ratingToInputState(false, undefined)).toBe(`default`);
    });
  });

  describe(`when user answer is provided and rating is defined`, () => {
    test(`returns 'success' for Rating.Easy`, () => {
      expect(ratingToInputState(false, Rating.Easy)).toBe(`success`);
    });

    test(`returns 'success' for Rating.Good`, () => {
      expect(ratingToInputState(false, Rating.Good)).toBe(`success`);
    });

    test(`returns 'warning' for Rating.Hard`, () => {
      expect(ratingToInputState(false, Rating.Hard)).toBe(`warning`);
    });

    test(`returns 'error' for Rating.Again`, () => {
      expect(ratingToInputState(false, Rating.Again)).toBe(`error`);
    });
  });
});
