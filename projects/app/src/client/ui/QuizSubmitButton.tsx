import { mergeRefs } from "@/client/react";
import type { PropsOf } from "@pinyinly/lib/types";
import { useLayoutEffect, useRef } from "react";
import type { ViewInstance } from "react-native";
import z from "zod";
import { RectButton } from "./RectButton";
import { RatingReason } from "./QuizDeckRatingReason";

const quizSubmitButtonStateSchema = z.enum({
  Disabled: `Disabled`,
  Check: `Check`,
  Correct: `Correct`,
  Incorrect: `Incorrect`,
});

export const QuizSubmitButtonState = quizSubmitButtonStateSchema.enum;
export type QuizSubmitButtonState = z.infer<typeof quizSubmitButtonStateSchema>;

interface QuizSubmitButtonProps extends Pick<
  PropsOf<typeof RectButton>,
  `onPress` | `ref`
> {
  autoFocus?: boolean;
  isChecking?: boolean;
  isUserAnswerProvided: boolean;
  ratingReason: RatingReason | null;
}

export const QuizSubmitButton = ({
  autoFocus = false,
  isChecking = false,
  isUserAnswerProvided,
  ratingReason,
  onPress,
  ref,
}: QuizSubmitButtonProps) => {
  const disabled = ratingReason == null && !isUserAnswerProvided;

  let text;

  if (isChecking) {
    text = `Checking`;
  } else {
    switch (ratingReason) {
      case null: {
        text = `Check`;
        break;
      }
      case RatingReason.Perfect:
      case RatingReason.Good:
      case RatingReason.Slow: {
        text = `Continue`;
        break;
      }
      case RatingReason.Incorrect: {
        text = `Got it`;
        break;
      }
    }
  }

  const buttonRef = useRef<ViewInstance>(null);

  useLayoutEffect(() => {
    if (autoFocus && buttonRef.current != null) {
      buttonRef.current.focus();
    }
  }, [autoFocus, buttonRef]);

  return (
    <RectButton
      variant="filled"
      ref={mergeRefs(buttonRef, ref)}
      disabled={disabled || isChecking}
      className={`flex-1`}
      onPress={disabled || isChecking ? undefined : onPress}
    >
      {text}
    </RectButton>
  );
};
