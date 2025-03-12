import { ElementRef, forwardRef, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, ViewProps } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withClamp,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { AnimatedPressable } from "./AnimatedPressable";
import { PropsOf } from "./types";
import { hapticImpactIfMobile } from "./util";

export type AnswerButtonState =
  | `default`
  | `selected`
  | `success`
  | `error`
  | `dimmed`;

export type AnswerButtonProps = {
  children?: ViewProps[`children`];
  state?: AnswerButtonState;
  className?: string;
  inFlexRowParent?: boolean;
  textClassName?: string;
  disabled?: boolean;
} & Omit<PropsOf<typeof Pressable>, `children` | `disabled`>;

export const AnswerButton = forwardRef<
  ElementRef<typeof Pressable>,
  AnswerButtonProps
>(function AnswerButton(
  {
    disabled = false,
    children,
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
  const bgScale = useSharedValue(0.5);
  const bgOpacity = useSharedValue(0);

  const animationFactor = 1;

  useEffect(() => {
    setPrevState(state);
  }, [state]);

  const stateChanged = state !== prevState;

  const withScaleAnimation = () =>
    withSequence(
      withTiming(0.5, { duration: 0 }),
      withTiming(1.03, {
        duration: 200 * animationFactor,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(1, {
        duration: 100 * animationFactor,
        easing: Easing.out(Easing.quad),
      }),
    );

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
          bgOpacity.set(withTiming(1, { duration: 100 * animationFactor }));
          break;
        }
        case `error`: {
          scale.set(withClamp({ min: 1 }, withScaleAnimation()));
          bgScale.set(withClamp({ max: 1 }, withScaleAnimation()));
          bgOpacity.set(withTiming(1, { duration: 100 * animationFactor }));
          break;
        }
        case `success`: {
          scale.set(withClamp({ min: scale.get() }, withScaleAnimation()));
          bgScale.set(
            withClamp({ min: bgScale.get(), max: 1 }, withScaleAnimation()),
          );
          bgOpacity.set(
            withClamp(
              { min: bgOpacity.get() },
              withTiming(1, { duration: 100 * animationFactor }),
            ),
          );
          break;
        }
      }
    }
  }, [bgOpacity, bgScale, scale, stateChanged, state]);

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
      style={{ transform: [{ scale }] }}
      className={pressable({ flat, state, inFlexRowParent, className })}
    >
      <Animated.View
        style={bgAnimatedStyle}
        className={bgAnimatedClass({ state })}
      />
      <View
        className={roundedRect({
          flat,
          pressed,
          disabled,
          filled: state !== `default` && bgFilled,
          hovered,
          className,
        })}
      >
        <Text
          className={text({ state, className: textClassName })}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {children}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

const bgAnimatedClass = tv({
  base: `pointer-events-none absolute bottom-[2px] left-[1px] right-[1px] top-[2px] rounded-lg bg-accent-4`,
  variants: {
    state: {
      default: ``,
      dimmed: ``,
      selected: ``,
      success: `bg-transparent`,
      error: `bg-transparent`,
    },
  },
});

const pressable = tv({
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

const text = tv({
  base: `text-center text-sm font-bold text-text`,
  variants: {
    state: {
      default: `text-text`,
      dimmed: `text-primary-9`,
      selected: `text-accent-9`,
      success: `text-accent-9`,
      error: `text-accent-9`,
    },
  },
});

const roundedRect = tv({
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
