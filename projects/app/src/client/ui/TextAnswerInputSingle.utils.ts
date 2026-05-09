import { Rating } from "@/util/fsrs";

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
  rating: Rating | undefined,
): TextAnswerInputSingleState {
  if (isUserAnswerEmpty || rating == undefined) {
    // If the user hasn't provided an answer, we don't want to show a success
    // state even if the grade is technically correct, because it makes it look
    // like their answer was graded, but really it was just skipped because they
    // pressed "I don't know".
    return `default`;
  }

  switch (rating) {
    case Rating.Easy:
    case Rating.Good: {
      return `success`;
    }
    case Rating.Hard: {
      return `warning`;
    }
    case Rating.Again: {
      return `error`;
    }
  }
}
