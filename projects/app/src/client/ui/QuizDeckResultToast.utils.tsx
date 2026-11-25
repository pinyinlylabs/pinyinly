import { RatingReason } from "./QuizDeckRatingReason";
import type { PylyThemeName } from "./Theme";

export function ratingReasonToThemeName(status: RatingReason): PylyThemeName {
  switch (status) {
    case RatingReason.Perfect:
    case RatingReason.Good: {
      return `success-panel`;
    }
    case RatingReason.Slow: {
      return `warning-panel`;
    }
    case RatingReason.Incorrect: {
      return `danger-panel`;
    }
  }
}
