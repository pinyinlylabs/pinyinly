import { characterCount } from "@/dictionary/dictionary";
import { ElementRef, forwardRef, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withClamp,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { hapticImpactIfMobile } from "../hooks";
import { AnimatedPressable } from "./AnimatedPressable";
import { Hhhmark } from "./Hhhmark";
import { PropsOf } from "./types";

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

export const TextAnswerButton = forwardRef<
  ElementRef<typeof Pressable>,
  TextAnswerButtonProps
>(function TextAnswerButton(
  {
    disabled = false,
    text,
    state = `default`,
    inFlexRowParent = false,
    className,
    textClassName,
    ...pressableProps
  },
  ref,
) {
  const [prevState, setPrevState] = useState(state);
  const [bgFilled, setBgFilled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(`0deg`);
  const bgScale = useSharedValue(0.5);
  const bgOpacity = useSharedValue(0);

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
          bgScale.set(0.5);
          bgOpacity.set(0);
          break;
        }
        case `selected`: {
          scale.set(withClamp({ min: 1 }, withScaleAnimation()));
          bgScale.set(withClamp({ max: 1 }, withScaleAnimation()));
          bgOpacity.set(withTiming(1, { duration }));
          break;
        }
        case `error`: {
          rotation.set(withIncorrectWobbleAnimation());
          bgOpacity.set(withTiming(1, { duration }));
          break;
        }
        case `success`: {
          bgOpacity.set(
            withClamp({ min: bgOpacity.get() }, withTiming(1, { duration })),
          );
          break;
        }
      }
    }
  }, [bgOpacity, bgScale, scale, stateChanged, state, rotation]);

  // When the background scale reaches 100% update `bgFilled` to make the border
  // bright.
  useAnimatedReaction(
    () => bgScale.get(),
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
    [bgScale],
  );

  // eslint-disable-next-line unicorn/expiring-todo-comments
  // TODO [react-native-reanimated@>=3.17] try using `useAnimatedStyle`
  //
  // It wasn't working in 3.16 on iOS, the styles just weren't applied.
  // perhaps the babel plugin isn't working properly or something else?
  const bgAnimatedStyle = useMemo(
    () => ({
      opacity: bgOpacity,
      transform: [{ scale: bgScale }],
    }),
    [bgOpacity, bgScale],
  );

  const pressableAnimatedStyle = useMemo(
    () => ({ transform: [{ scale }, { rotateZ: rotation }] }),
    [rotation, scale],
  );

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
      ref={ref}
      style={pressableAnimatedStyle}
      className={pressableClass({ flat, state, inFlexRowParent, className })}
    >
      <Animated.View
        style={bgAnimatedStyle}
        className={bgAnimatedClass({ state })}
      />
      <View
        className={roundedRectClass({
          flat,
          pressed,
          disabled,
          filled: state !== `default` && bgFilled,
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
          <Hhhmark source={text} />
        </Text>
      </View>
    </AnimatedPressable>
  );
});

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
  base: `pointer-events-none absolute bottom-[2px] left-[1px] right-[1px] top-[2px] rounded-lg bg-accent-4`,
  variants: {
    state: {
      default: ``,
      dimmed: ``,
      selected: ``,
      success: `bg-accent-10`,
      error: `bg-transparent`,
    },
  },
});

const pressableClass = tv({
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
      success: `success-theme`,
      error: `danger-theme`,
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
  base: `px-1 text-center font-bold text-text web:transition-color`,
  variants: {
    state: {
      default: `text-text`,
      dimmed: `text-primary-9`,
      selected: `text-accent-9`,
      success: `text-accent-8`,
      error: `text-accent-9`,
    },
    length: {
      tiny: `text-xl/tight lg:text-2xl/tight`,
      short: `text-lg/tight lg:text-xl/tight`,
      medium: `text-sm lg:text-lg/tight`,
      long: `text-xs lg:text-md/tight`,
    },
  },
});

const roundedRectClass = tv({
  base: `items-center select-none justify-center border-2 px-3 py-1 rounded-lg`,
  variants: {
    disabled: {
      true: `opacity-50 select-none cursor-default`,
    },
    flat: {
      false: `border-b-4`,
    },
    filled: {
      true: `border-accent-9`,
      false: `border-primary-7`,
    },
    pressed: {
      true: ``,
    },
    hovered: {
      true: ``,
    },
  },
  compoundVariants: [
    {
      disabled: false,
      filled: false,
      hovered: true,
      class: `border-primary-8`,
    },
    {
      filled: false,
      pressed: true,
      class: `border-primary-8`,
    },
  ],
});
