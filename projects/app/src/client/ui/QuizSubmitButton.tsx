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
  state: QuizSubmitButtonState;
}

export const QuizSubmitButton = ({
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

  return (
    <RectButton2
      variant="filled"
      ref={ref}
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
