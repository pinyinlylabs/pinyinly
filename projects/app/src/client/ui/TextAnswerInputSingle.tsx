import { useEffect, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import type { TextInput } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { withIncorrectWobbleAnimation } from "./animations";
import type { TextAnswerInputSingleState } from "./TextAnswerInputSingle.utils";
import { TextInputSingle } from "./TextInputSingle";
import { Theme } from "./Theme";
import { tv } from "tailwind-variants";

export type TextAnswerInputSingleProps = {
  autoFocus?: boolean;
  /**
   * Legacy alias for non-editable behavior.
   * Prefer using `editable` for new code.
   */
  disabled?: boolean;
  /**
   * Controls whether the input can be edited.
   * If undefined, it is derived from `disabled`.
   */
  editable?: boolean;
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
  editable,
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
    <Theme theme={themeForState[state]}>
      <Reanimated.View style={animatedStyle}>
        <View className="items-center gap-2">
          <TextInputSingle
            autoFocus={autoFocus}
            autoCapitalize="none"
            autoCorrect={autoCorrect}
            className={inputClass({ styled: state !== `default` })}
            disabled={disabled}
            editable={editable}
            onChangeText={handleChangeText}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === `Enter`) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={state === `default` ? placeholder : undefined}
            textAlign="center"
            ref={inputRef}
            value={text}
          />
          {hintText == null ? null : (
            <Text className="pyly-body-caption">{hintText}</Text>
          )}
        </View>
      </Reanimated.View>
    </Theme>
  );
};

const inputClass = tv({
  base: `self-stretch border-[3px] border-transparent`,
  variants: {
    styled: {
      true: `border-fg bg-fg/10 text-fg`,
    },
  },
});

const themeForState = {
  default: undefined,
  success: `success-panel`,
  error: `danger-panel`,
  warning: `warning-panel`,
} as const;
