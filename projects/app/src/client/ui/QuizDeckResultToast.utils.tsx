import { Rating } from "@/util/fsrs";

export function ratingToThemeClass(rating: Rating) {
  switch (rating) {
    case Rating.Easy:
    case Rating.Good: {
      return `theme-success-panel`;
    }
    case Rating.Hard: {
      return `theme-warning-panel`;
    }
    case Rating.Again: {
      return `theme-danger-panel`;
    }
  }
}
