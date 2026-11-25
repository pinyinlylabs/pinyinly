import { RatingReason } from "./QuizDeckRatingReason";

export type TextAnswerInputSingleState =
  | `default`
  | `success`
  | `error`
  | `warning`;

/**
 * Maps a quiz rating to the corresponding input state.
 */

export function ratingToInputState(
  isUserAnswerEmpty: boolean,
  ratingReason: RatingReason | null,
): TextAnswerInputSingleState {
  if (isUserAnswerEmpty || ratingReason == null) {
    // If the user hasn't provided an answer, we don't want to show a success
    // state even if the grade is technically correct, because it makes it look
    // like their answer was graded, but really it was just skipped because they
    // pressed "I don't know".
    return `default`;
  }

  switch (ratingReason) {
    case RatingReason.Perfect:
    case RatingReason.Good: {
      return `success`;
    }
    case RatingReason.Slow: {
      return `warning`;
    }
    case RatingReason.Incorrect: {
      return `error`;
    }
  }
}
