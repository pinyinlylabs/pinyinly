import { Rating } from "@/util/fsrs";
import { characterCount } from "@/util/unicode";
import type { PropsOf } from "@pinyinly/lib/types";
import type { ReactNode } from "react";
import type { Pressable } from "react-native";

export type TextAnswerButtonState =
  | `default`
  | `selected`
  | `success`
  | `error`
  | `warning`
  | `dimmed`;

export type TextAnswerButtonFontSize = `xs` | `sm` | `lg` | `xl`;

export type TextAnswerButtonProps = {
  text: string;
  /**
   * Allow setting the font size explicitly, this allows making all choices in a
   * quiz the same font size which avoids subconsciously biasing answers based
   * on font size.
   */
  fontSize?: TextAnswerButtonFontSize;
  state?: TextAnswerButtonState;
  className?: string;
  renderWikiModal?: (onDismiss: () => void) => ReactNode;
  inFlexRowParent?: boolean;
  textClassName?: string;
  disabled?: boolean;
} & Omit<PropsOf<typeof Pressable>, `children` | `disabled`>;

/**
 * Maps a quiz rating to the corresponding button state for correct answers.
 */
export function ratingToButtonState(rating: Rating): TextAnswerButtonState {
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

export function textAnswerButtonFontSize(
  text: string,
): TextAnswerButtonFontSize {
  const length = characterCount(text);
  return length <= 10
    ? (`xl` as const)
    : length <= 20
      ? (`lg` as const)
      : length <= 40
        ? (`sm` as const)
        : (`xs` as const);
}
