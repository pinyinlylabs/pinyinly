import { mergeRefs } from "@/client/react";
import { Rating } from "@/util/fsrs";
import type { PropsOf } from "@pinyinly/lib/types";
import { useLayoutEffect, useRef } from "react";
import type { View } from "react-native";
import z from "zod/v4";
import { ratingToThemeClass } from "./QuizDeckResultToast.utils";
import { RectButton } from "./RectButton";

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
  disabled: boolean;
  rating: Rating | null | undefined;
}

export const QuizSubmitButton = ({
  autoFocus = false,
  disabled,
  rating,
  onPress,
  ref,
}: QuizSubmitButtonProps) => {
  let text;

  switch (rating) {
    case undefined:
    case null: {
      text = `Check`;
      break;
    }
    case Rating.Easy:
    case Rating.Good:
    case Rating.Hard: {
      text = `Continue`;
      break;
    }
    case Rating.Again: {
      text = `Got it`;
      break;
    }
  }

  const buttonRef = useRef<View>(null);

  useLayoutEffect(() => {
    if (autoFocus && buttonRef.current != null) {
      buttonRef.current.focus();
    }
  }, [autoFocus, buttonRef]);

  return (
    <RectButton
      variant="filled"
      ref={mergeRefs(buttonRef, ref)}
      disabled={disabled}
      className={`
        flex-1

        ${disabled ? `` : rating == null ? `theme-success-panel` : ratingToThemeClass(rating)}
      `}
      onPress={disabled ? undefined : onPress}
    >
      {text}
    </RectButton>
  );
};
