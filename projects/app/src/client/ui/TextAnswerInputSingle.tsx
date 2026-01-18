import { Rating } from "@/util/fsrs";
import type { ReactNode, Ref } from "react";
import { useEffect, useState } from "react";
import type { TextInput } from "react-native";
import { Text, View } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { withIncorrectWobbleAnimation } from "./animations";
import { TextInputSingle } from "./TextInputSingle";

export type TextAnswerInputSingleState =
  | `default`
  | `success`
  | `error`
  | `warning`;

/**
 * Maps a quiz rating to the corresponding input state.
 */
export function ratingToInputState(rating: Rating): TextAnswerInputSingleState {
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

export type TextAnswerInputSingleProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  inputRef?: Ref<TextInput>;
  onChangeValue: (value: string) => void;
  onSubmit: () => void;
  hintText?: ReactNode;
  state?: TextAnswerInputSingleState;
  initialValue?: string;
  placeholder: string;
  /**
   * Whether to use system auto-correct. Useful for English input.
   * @default false
   */
  autoCorrect?: boolean;
  /**
   * Controlled value. When provided, the component operates in controlled mode.
   * The parent must update this value via onChangeText.
   */
  value?: string;
};

/**
 * A text input for quiz answers with success/error states and animations.
 * Similar to TextAnswerButton but for typed input instead of button selection.
 */
export const TextAnswerInputSingle = ({
  autoFocus = false,
  disabled = false,
  inputRef,
  onChangeValue,
  onSubmit,
  hintText,
  state = `default`,
  initialValue = ``,
  placeholder,
  autoCorrect = false,
  value: controlledValue,
}: TextAnswerInputSingleProps) => {
  const [internalText, setInternalText] = useState(initialValue);
  const isControlled = controlledValue !== undefined;
  const text = isControlled ? controlledValue : internalText;

  const rotationSv = useSharedValue(`0deg`);

  useEffect(() => {
    if (state === `error`) {
      rotationSv.set(withIncorrectWobbleAnimation());
    }
  }, [state, rotationSv]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: rotationSv.get() }],
  }));

  const handleChangeText = (newText: string) => {
    if (!isControlled) {
      setInternalText(newText);
    }
    onChangeValue(newText);
  };

  return (
    <Reanimated.View style={animatedStyle} className={wrapperClass({ state })}>
      <View className="items-center gap-2">
        <TextInputSingle
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={autoCorrect}
          className={inputClass({ styled: state !== `default` })}
          disabled={disabled}
          onChangeText={handleChangeText}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === `Enter`) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          textAlign="center"
          ref={inputRef}
          value={text}
        />
        {hintText == null ? null : (
          <Text className="pyly-body-caption">{hintText}</Text>
        )}
      </View>
    </Reanimated.View>
  );
};

const inputClass = tv({
  base: `self-stretch border-2 border-transparent`,
  variants: {
    styled: {
      true: `border-fg bg-fg/10 text-fg`,
    },
  },
});

const wrapperClass = tv({
  base: ``,
  variants: {
    state: {
      default: ``,
      success: `theme-success-panel`,
      error: `theme-danger-panel`,
      warning: `theme-warning-panel`,
    },
  },
});
