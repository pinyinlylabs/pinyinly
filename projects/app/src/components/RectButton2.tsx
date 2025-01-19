import { ElementRef, forwardRef, useState } from "react";
import { Pressable, Text, View, ViewProps } from "react-native";
import { tv } from "tailwind-variants";
import { PropsOf } from "./types";
import { hapticImpactIfMobile } from "./util";

export type ButtonVariant = `filled` | `outline` | `bare`;

export type RectButton2Props = {
  variant?: ButtonVariant;
  accent?: boolean;
  children?: ViewProps[`children`];
  className?: string;
  inFlexRowParent?: boolean;
  textClassName?: string;
} & Pick<
  PropsOf<typeof Pressable>,
  keyof PropsOf<typeof Pressable> & (`on${string}` | `disabled`)
>;

export const RectButton2 = forwardRef<
  ElementRef<typeof Pressable>,
  RectButton2Props
>(function RectButton2(
  {
    children,
    variant = `outline`,
    accent = false,
    className,
    inFlexRowParent = false,
    textClassName,
    ...pressableProps
  },
  ref,
) {
  const disabled = pressableProps.disabled === true;

  if (disabled) {
    accent = false;
  }

  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const flat = pressed || disabled;

  return (
    <Pressable
      {...pressableProps}
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
      ref={ref}
      className={pressable({ flat, variant, inFlexRowParent, className })}
    >
      <View
        className={roundedRect({
          flat,
          accent,
          variant,
          disabled,
          pressed,
          hovered,
          className,
        })}
      >
        <Text className={text({ variant, accent, class: textClassName })}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
});

const pressable = tv({
  base: ``,
  variants: {
    flat: {
      true: ``,
    },
    variant: {
      filled: ``,
      outline: ``,
      bare: ``,
    },
    inFlexRowParent: {
      true: `flex-row`,
    },
  },
  compoundVariants: [
    {
      flat: true,
      variant: `filled`,
      class: `pt-[4px]`,
    },
    {
      flat: true,
      variant: `outline`,
      class: `pt-[2px]`,
    },
  ],
});

const roundedRect = tv({
  base: `rounded-lg px-3 py-[4px] items-center justify-center`,
  variants: {
    variant: {
      filled: `py-[5px]`,
      outline: `border-[2px]`,
      bare: ``,
    },
    hovered: {
      true: ``,
    },
    flat: {
      true: ``,
    },
    accent: {
      true: ``,
    },
    pressed: {
      true: ``,
    },
    disabled: {
      true: `opacity-50 select-none cursor-default`,
    },
  },
  compoundVariants: [
    {
      variant: `filled`,
      accent: true,
      class: `bg-accent-10 border-accent-9`,
    },
    {
      variant: `filled`,
      hovered: true,
      accent: true,
      class: `bg-accent-11`,
    },
    {
      variant: `filled`,
      accent: false,
      class: `bg-primary-10 border-primary-9`,
    },
    {
      variant: `filled`,
      accent: false,
      disabled: false,
      hovered: true,
      class: `bg-primary-11 border-primary-10`,
    },
    {
      variant: `filled`,
      flat: false,
      class: `border-b-[4px]`,
    },
    {
      variant: `outline`,
      accent: true,
      class: `border-accent-9`,
    },
    {
      variant: `outline`,
      accent: false,
      class: `border-primary-7`,
    },
    {
      variant: `outline`,
      accent: false,
      disabled: false,
      hovered: true,
      class: `border-primary-8`,
    },
    {
      variant: `outline`,
      accent: false,
      disabled: false,
      pressed: true,
      class: `border-primary-8`,
    },
    {
      variant: `outline`,
      flat: true,
      class: `border-b-[2px]`,
    },
    {
      variant: `outline`,
      flat: false,
      class: `border-b-[4px]`,
    },
  ],
});

const text = tv({
  base: `font-bold select-none text-sm uppercase`,
  variants: {
    variant: {
      filled: `text-primary-2`,
      outline: ``,
      bare: ``,
    },
    accent: {
      true: ``,
    },
  },
  compoundVariants: [
    {
      variant: [`outline`, `bare`],
      accent: true,
      class: `text-accent-9`,
    },
    {
      variant: [`outline`, `bare`],
      accent: false,
      class: `text-primary-12`,
    },
  ],
});
