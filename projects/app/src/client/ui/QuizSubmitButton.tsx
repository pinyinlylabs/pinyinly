import { mergeRefs } from "@/client/react";
import type { PropsOf } from "@pinyinly/lib/types";
import { useLayoutEffect, useRef } from "react";
import type { View } from "react-native";
import { tv } from "tailwind-variants";
import z from "zod/v4";
import { RectButton } from "./RectButton";

const quizSubmitButtonStateSchema = z.enum({
  Disabled: `Disabled`,
  Check: `Check`,
  Correct: `Correct`,
  Incorrect: `Incorrect`,
});

export const QuizSubmitButtonState = quizSubmitButtonStateSchema.enum;
export type QuizSubmitButtonState = z.infer<typeof quizSubmitButtonStateSchema>;

interface QuizSubmitButtonProps
  extends Pick<PropsOf<typeof RectButton>, `onPress` | `ref`> {
  autoFocus?: boolean;
  state: QuizSubmitButtonState;
}

export const QuizSubmitButton = ({
  autoFocus = false,
  state,
  onPress,
  ref,
}: QuizSubmitButtonProps) => {
  let text;

  switch (state) {
    case QuizSubmitButtonState.Disabled:
    case QuizSubmitButtonState.Check: {
      text = `Check`;
      break;
    }
    case QuizSubmitButtonState.Correct: {
      text = `Continue`;
      break;
    }
    case QuizSubmitButtonState.Incorrect: {
      text = `Got it`;
      break;
    }
  }

  const buttonRef = useRef<View>(null);

  useLayoutEffect(() => {
    if (autoFocus && buttonRef.current != null) {
      buttonRef.current.focus();
    }
  }, [autoFocus, buttonRef, state]);

  return (
    <RectButton
      variant="filled"
      ref={mergeRefs(buttonRef, ref)}
      disabled={state === QuizSubmitButtonState.Disabled}
      className={buttonClass({ state })}
      onPress={state === QuizSubmitButtonState.Disabled ? undefined : onPress}
    >
      {text}
    </RectButton>
  );
};

const buttonClass = tv({
  base: `flex-1`,
  variants: {
    state: {
      [QuizSubmitButtonState.Check]: `theme-success`,
      [QuizSubmitButtonState.Correct]: `theme-success`,
      [QuizSubmitButtonState.Disabled]: ``,
      [QuizSubmitButtonState.Incorrect]: `theme-danger`,
    },
  },
});
