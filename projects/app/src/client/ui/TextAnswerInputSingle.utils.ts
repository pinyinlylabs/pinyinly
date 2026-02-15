import { Rating } from "@/util/fsrs";

export type TextAnswerInputSingleState =
  | `default`
  | `success`
  | `error`
  | `warning`;

/**
 * Maps a quiz rating to the corresponding input state.
 */
export function ratingToInputState(rating: Rating): TextAnswerInputSingleState {
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
