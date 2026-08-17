import { Rating } from "@/util/fsrs";
import type { PylyThemeName } from "./Theme";

export function ratingToThemeName(rating: Rating): PylyThemeName {
  switch (rating) {
    case Rating.Easy:
    case Rating.Good: {
      return `success-panel`;
    }
    case Rating.Hard: {
      return `warning-panel`;
    }
    case Rating.Again: {
      return `danger-panel`;
    }
  }
}
