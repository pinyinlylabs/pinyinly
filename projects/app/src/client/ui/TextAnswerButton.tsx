import { characterCount } from "@/dictionary/dictionary";
import { useEffect, useMemo, useState } from "react";
import type { Pressable } from "react-native";
import { Text, View } from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withClamp,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { hapticImpactIfMobile } from "../hooks/hapticImpactIfMobile";
import { AnimatedPressable } from "./AnimatedPressable";
import type { PropsOf } from "./types";

export type TextAnswerButtonState =
  | `default`
  | `selected`
  | `success`
  | `error`
  | `dimmed`;

export type TextAnswerButtonProps = {
  text: string;
  state?: TextAnswerButtonState;
  className?: string;
  inFlexRowParent?: boolean;
  textClassName?: string;
  disabled?: boolean;
} & Omit<PropsOf<typeof Pressable>, `children` | `disabled`>;

export function TextAnswerButton({
  disabled = false,
  text,
  state = `default`,
  inFlexRowParent = false,
  className,
  textClassName,
  ...pressableProps
}: TextAnswerButtonProps) {
  const [prevState, setPrevState] = useState(state);
  const [bgFilled, setBgFilled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const scaleSv = useSharedValue(1);
  const rotationSv = useSharedValue(`0deg`);
  const bgScaleSv = useSharedValue(0.5);
  const bgOpacitySv = useSharedValue(0);

  useEffect(() => {
    setPrevState(state);
  }, [state]);

  const stateChanged = state !== prevState;

  useEffect(() => {
    if (stateChanged) {
      switch (state) {
        case `dimmed`:
        case `default`: {
          setBgFilled(false);
          bgScaleSv.set(0.5);
          bgOpacitySv.set(0);
          break;
        }
        case `selected`: {
          scaleSv.set(withClamp({ min: 1 }, withScaleAnimation()));
          bgScaleSv.set(withClamp({ max: 1 }, withScaleAnimation()));
          bgOpacitySv.set(withTiming(1, { duration }));
          break;
        }
        case `error`: {
          rotationSv.set(withIncorrectWobbleAnimation());
          bgOpacitySv.set(withTiming(1, { duration }));
          break;
        }
        case `success`: {
          bgOpacitySv.set(
            withClamp({ min: bgOpacitySv.get() }, withTiming(1, { duration })),
          );
          break;
        }
      }
    }
  }, [bgOpacitySv, bgScaleSv, scaleSv, stateChanged, state, rotationSv]);

  // When the background scale reaches 100% update `bgFilled` to make the border
  // bright.
  useAnimatedReaction(
    () => bgScaleSv.get(),
    (currentValue, previousValue) => {
      if (currentValue < 1 && (previousValue === null || previousValue >= 1)) {
        runOnJS(setBgFilled)(false);
      } else if (
        currentValue >= 1 &&
        (previousValue === null || previousValue < 1)
      ) {
        runOnJS(setBgFilled)(true);
      }
    },
    [bgScaleSv],
  );

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacitySv.get(),
    transform: [{ scale: bgScaleSv.get() }],
  }));

  const pressableAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSv.get() }, { rotateZ: rotationSv.get() }],
  }));

  const textLength = useMemo(() => {
    const charCount = characterCount(text);
    return charCount <= 5
      ? (`tiny` as const)
      : charCount <= 20
        ? (`short` as const)
        : charCount <= 40
          ? (`medium` as const)
          : (`long` as const);
  }, [text]);

  const flat = pressed || disabled;

  return (
    <AnimatedPressable
      {...pressableProps}
      disabled={disabled}
      onHoverIn={(e) => {
        setHovered(true);
        pressableProps.onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        pressableProps.onHoverOut?.(e);
      }}
      onPressIn={(e) => {
        setPressed(true);
        hapticImpactIfMobile();
        pressableProps.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        pressableProps.onPressOut?.(e);
      }}
      onPress={(e) => {
        pressableProps.onPress?.(e);
      }}
      style={pressableAnimatedStyle}
      className={containerClass({ flat, state, inFlexRowParent, className })}
    >
      <Reanimated.View
        style={bgAnimatedStyle}
        className={bgAnimatedClass({ state })}
      />
      <View
        className={rectClass({
          flat,
          pressed,
          disabled,
          filled: state !== `default` && bgFilled,
          state,
          hovered,
          className,
        })}
      >
        <Text
          className={textClass({
            state,
            length: textLength,
            className: textClassName,
          })}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const duration = 100;

const withScaleAnimation = () =>
  withSequence(
    withTiming(0.5, { duration: 0 }),
    withTiming(1.03, {
      duration: 2 * duration,
      easing: Easing.inOut(Easing.quad),
    }),
    withTiming(1, {
      duration,
      easing: Easing.out(Easing.quad),
    }),
  );

const withIncorrectWobbleAnimation = () => {
  let offset = Math.random() * 4 - 2;
  offset += offset < 0 ? -0.5 : 0.5;

  return withSpring(`${offset}deg`, { duration: 2 * duration });
};

const bgAnimatedClass = tv({
  base: `pointer-events-none absolute inset-x-px inset-y-[2px] rounded-lg bg-cyan-10/10`,
  variants: {
    state: {
      default: ``,
      dimmed: ``,
      selected: ``,
      success: `bg-foreground`,
      error: `bg-transparent`,
    },
  },
});

const containerClass = tv({
  base: ``,
  variants: {
    flat: {
      true: ``,
    },
    inFlexRowParent: {
      true: `flex-row`,
    },
    state: {
      default: ``,
      dimmed: ``,
      selected: ``,
      success: `success-theme2`,
      error: `danger-theme2`,
    },
  },
  compoundVariants: [
    {
      flat: true,
      class: `pt-[4px]`,
    },
    {
      flat: true,
      class: `pt-[2px]`,
    },
  ],
});

const textClass = tv({
  // px-1: Horizontal padding is necessary to give first and last letters on a
  // line with accents enough space to not be clipped. Without this words like
  // "lǐ" will have half the accent clipped.
  base: `px-1 text-center font-normal text-foreground web:transition-colors`,
  variants: {
    state: {
      default: `text-foreground`,
      dimmed: `text-primary-9`,
      selected: `text-cyan-10`,
      success: `text-background`,
      error: `text-red-10`,
    },
    length: {
      tiny: `text-xl/tight lg:text-2xl/tight`,
      short: `text-lg/tight lg:text-xl/tight`,
      medium: `text-sm lg:text-lg/tight`,
      long: `text-xs lg:text-base/tight`,
    },
  },
});

const rectClass = tv({
  base: `select-none items-center justify-center rounded-lg border-2 px-3 py-1`,
  variants: {
    disabled: {
      true: `cursor-default select-none opacity-50`,
    },
    flat: {
      false: `border-b-4`,
    },
    filled: {
      true: ``,
    },
    pressed: {
      true: ``,
    },
    hovered: {
      true: ``,
    },
    state: {
      default: ``,
      dimmed: ``,
      selected: ``,
      success: ``,
      error: ``,
    },
  },
  compoundVariants: [
    {
      filled: false,
      pressed: true,
      class: `border-cyan-5`,
    },
    // unfilled border
    {
      filled: false,
      class: `border-foreground/20`,
    },
    {
      filled: false,
      hovered: true,
      class: `border-foreground/30`,
    },
    // filled border
    {
      state: `success`,
      filled: true,
      class: `border-foreground-bg75`,
    },
    {
      state: `selected`,
      filled: true,
      class: `border-cyan-10/90`,
    },
    {
      state: `error`,
      filled: true,
      class: `border-red-10`,
    },
  ],
});
