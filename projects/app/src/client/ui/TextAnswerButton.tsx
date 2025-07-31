import { graphemeCount } from "@/util/unicode";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Pressable } from "react-native";
import { Text, View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withClamp,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { runOnJS, runOnUI } from "react-native-worklets";
import { tv } from "tailwind-variants";
import { hapticImpactIfMobile } from "../hooks/hapticImpactIfMobile";
import { ReanimatedPressable } from "./ReanimatedPressable";
import { ShootingStars } from "./ShootingStars";
import type { PropsOf } from "./types";

const targetBgScale: Record<TextAnswerButtonState, number> = {
  dimmed: 0.5,
  default: 0.5,
  selected: 1,
  error: 1,
  success: 1,
};
const targetBgOpacity: Record<TextAnswerButtonState, number> = {
  dimmed: 0,
  default: 0,
  selected: 1,
  error: 1,
  success: 1,
};
const targetScale: Record<TextAnswerButtonState, number> = {
  dimmed: 1,
  default: 1,
  selected: 1,
  error: 1,
  success: 1,
};
const targetRotation: Record<TextAnswerButtonState, string> = {
  dimmed: `0deg`,
  default: `0deg`,
  selected: `0deg`,
  error: `0deg`,
  success: `0deg`,
};

export type TextAnswerButtonState =
  | `default`
  | `selected`
  | `success`
  | `error`
  | `dimmed`;

export type TextAnswerButtonFontSize = `xs` | `sm` | `lg` | `xl`;

export type TextAnswerButtonProps = {
  text: string;
  /**
   * Allow setting the font size explicitly, this allows making all choices in a
   * quiz the same font size which avoids subconsciously biasing answers based
   * on font size.
   */
  fontSize?: TextAnswerButtonFontSize;
  state?: TextAnswerButtonState;
  className?: string;
  renderWikiModal?: (onDismiss: () => void) => ReactNode;
  inFlexRowParent?: boolean;
  textClassName?: string;
  disabled?: boolean;
} & Omit<PropsOf<typeof Pressable>, `children` | `disabled`>;

export function TextAnswerButton({
  disabled = false,
  text,
  fontSize = textAnswerButtonFontSize(text),
  state = `default`,
  renderWikiModal,
  inFlexRowParent = false,
  className,
  textClassName,
  ...pressableProps
}: TextAnswerButtonProps) {
  const [prevState, setPrevState] = useState(state);
  const [bgFilled, setBgFilled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showWikiModal, setWikiModal] = useState(false);

  const scaleSv = useSharedValue(targetScale[state]);
  const rotationSv = useSharedValue(targetRotation[state]);
  const bgScaleSv = useSharedValue(targetBgScale[state]);
  const bgOpacitySv = useSharedValue(targetBgOpacity[state]);

  if (state !== prevState) {
    let newScale = targetScale[state];
    let newBgScale = targetBgScale[state];
    let newRotation = targetRotation[state];
    let newBgOpacity = targetBgOpacity[state];

    runOnUI(() => {
      switch (state) {
        case `dimmed`:
        case `default`: {
          break;
        }
        case `selected`: {
          newBgScale = withClamp(
            { max: 1 },
            withPulseSpringAnimation(newBgScale),
          );
          newBgOpacity = withClamp(
            { min: bgOpacitySv.get() },
            withTiming(newBgOpacity, { duration }),
          );
          newScale = withClamp({ min: 1 }, withPulseSpringAnimation(newScale));
          break;
        }
        case `error`: {
          newBgOpacity = withClamp(
            { min: bgOpacitySv.get() },
            withTiming(newBgOpacity, { duration }),
          );
          newRotation = withIncorrectWobbleAnimation();
          break;
        }
        case `success`: {
          newBgOpacity = withClamp(
            { min: bgOpacitySv.get() },
            withTiming(newBgOpacity, { duration }),
          );
          break;
        }
      }

      scaleSv.set(newScale);
      bgScaleSv.set(newBgScale);
      bgOpacitySv.set(newBgOpacity);
      rotationSv.set(newRotation);
    })();

    setPrevState(state);
  }

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

  const flat = pressed || disabled;

  const handleWikiModalDismiss = () => {
    setWikiModal(false);
  };

  return (
    <ReanimatedPressable
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
        if (renderWikiModal) {
          setWikiModal(true);
        } else if (state === `error`) {
          // Shake the button violently if the user presses it again after they
          // already made an error.
          rotationSv.set(withIncorrectShakeAnimation(rotationSv.get()));
        } else {
          pressableProps.onPress?.(e);
        }
      }}
      style={pressableAnimatedStyle}
      className={pressableClass({ state, inFlexRowParent, className })}
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
            fontSize,
            hasWikiModal: renderWikiModal != null,
            className: textClassName,
            hovered,
          })}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
      </View>
      <ShootingStars
        // The theme needs to be set on this explicitly because the Rive CSS
        // variable proxy doesn't handle class changes.
        className="theme-success pointer-events-none absolute -inset-3"
        play={state === `success`}
      />
      {showWikiModal && renderWikiModal != null
        ? renderWikiModal(handleWikiModalDismiss)
        : null}
    </ReanimatedPressable>
  );
}

const duration = 100;

const withPulseSpringAnimation = (target: number) =>
  withSequence(
    withTiming(target * 0.5, { duration: 0 }),
    withTiming(target * 1.03, {
      duration: 2 * duration,
      easing: Easing.inOut(Easing.quad),
    }),
    withTiming(target, {
      duration,
      easing: Easing.out(Easing.quad),
    }),
  );

const withIncorrectWobbleAnimation = () => {
  let offset = Math.random() * 4 - 2;
  offset += offset < 0 ? -0.5 : 0.5;

  return withSpring(`${offset}deg`, { duration: 2 * duration });
};

const withIncorrectShakeAnimation = (current: string) => {
  const deg = Number.parseFloat(current.replace(/deg$/, ``));
  return withRepeat(withSpring(`${deg + 2}deg`, { duration: 80 }), 4, true);
};

const bgAnimatedClass = tv({
  base: `pointer-events-none absolute inset-x-px inset-y-[2px] rounded-lg`,
  variants: {
    state: {
      default: ``,
      dimmed: ``,
      selected: `bg-cyanold/10`,
      success: `bg-fg/10`,
      error: `bg-transparent`,
    },
  },
});

const pressableClass = tv({
  base: `
    focus-visible:rounded-lg focus-visible:outline focus-visible:outline-4
    focus-visible:outline-offset-2 focus-visible:outline-fg/75

    web:transition-[outline-width]
  `,
  variants: {
    inFlexRowParent: {
      true: `flex-row`,
    },
    state: {
      default: ``,
      dimmed: ``,
      selected: ``,
      success: `theme-success`,
      error: `theme-danger`,
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
      true: `mt-[2px]`,
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
      class: `border-cyanold/50`,
    },
    // unfilled border
    {
      filled: false,
      class: `border-fg/20`,
    },
    {
      filled: false,
      hovered: true,
      class: `border-fg/30`,
    },
    // filled border
    {
      state: `success`,
      filled: true,
      class: `border-fg`,
    },
    {
      state: `selected`,
      filled: true,
      class: `border-cyanold/90`,
    },
    {
      state: `error`,
      filled: true,
      class: `border-brick`,
    },
  ],
});

const textClass = tv({
  // px-1: Horizontal padding is necessary to give first and last letters on a
  // line with accents enough space to not be clipped. Without this words like
  // "lǐ" will have half the accent clipped.
  base: `
    px-1 py-[2px] text-center font-normal text-fg

    web:transition-colors
  `,
  variants: {
    hovered: {
      true: ``,
    },
    hasWikiModal: {
      true: ``,
    },
    state: {
      default: `text-fg`,
      dimmed: `text-fg/90`,
      selected: `text-cyanold`,
      success: `text-fg`,
      error: `text-brick`,
    },
    fontSize: {
      xl: `
        pyly-ref-xl

        lg:pyly-ref-2xl

        text-xl/tight

        lg:text-2xl/tight
      `,
      lg: `
        pyly-ref-lg

        lg:pyly-ref-xl

        text-lg/tight

        lg:text-xl/tight
      `,
      sm: `
        pyly-ref-sm

        lg:pyly-ref-lg

        text-sm

        lg:text-lg/tight
      `,
      xs: `
        pyly-ref-xs

        lg:pyly-ref-base

        text-xs

        lg:text-base/tight
      `,
    },
  },
  compoundVariants: [
    {
      hasWikiModal: true,
      class: `
        underline decoration-currentColor/25

        [text-decoration-skip-ink:none]
      `,
    },
    {
      hasWikiModal: true,
      hovered: true,
      class: `decoration-currentColor/50`,
    },
  ],
});

export function textAnswerButtonFontSize(
  text: string,
): TextAnswerButtonFontSize {
  const length = graphemeCount(text);
  return length <= 10
    ? (`xl` as const)
    : length <= 20
      ? (`lg` as const)
      : length <= 40
        ? (`sm` as const)
        : (`xs` as const);
}
