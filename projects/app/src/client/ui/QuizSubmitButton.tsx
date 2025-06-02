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
      className={`flex-1 ${state === QuizSubmitButtonState.Disabled ? `` : state === QuizSubmitButtonState.Incorrect ? `danger-theme2` : `success-theme2`}`}
      onPress={state === QuizSubmitButtonState.Disabled ? undefined : onPress}
    >
      {text}
    </RectButton2>
  );
};
