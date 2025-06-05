import { focusVisible, mergeRefs } from "@/client/react";
import { useLayoutEffect, useRef } from "react";
import type { View } from "react-native";
import { tv } from "tailwind-variants";
import z from "zod/v4";
import { RectButton2 } from "./RectButton2";
import type { PropsOf } from "./types";

const quizSubmitButtonStateSchema = z.enum({
  Disabled: `Disabled`,
  Check: `Check`,
  Correct: `Correct`,
  Incorrect: `Incorrect`,
});

export const QuizSubmitButtonState = quizSubmitButtonStateSchema.enum;
export type QuizSubmitButtonState = z.infer<typeof quizSubmitButtonStateSchema>;

interface QuizSubmitButtonProps
  extends Pick<PropsOf<typeof RectButton2>, `onPress` | `ref`> {
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
      focusVisible(buttonRef.current);
    }
  }, [autoFocus, buttonRef, state]);

  return (
    <RectButton2
      variant="filled"
      ref={mergeRefs(buttonRef, ref)}
      disabled={state === QuizSubmitButtonState.Disabled}
      className={buttonClass({ state })}
      onPress={state === QuizSubmitButtonState.Disabled ? undefined : onPress}
    >
      {text}
    </RectButton2>
  );
};

const buttonClass = tv({
  base: `flex-1`,
  variants: {
    state: {
      [QuizSubmitButtonState.Check]: `success-theme2`,
      [QuizSubmitButtonState.Correct]: `success-theme2`,
      [QuizSubmitButtonState.Disabled]: ``,
      [QuizSubmitButtonState.Incorrect]: `danger-theme2`,
    },
  },
});
