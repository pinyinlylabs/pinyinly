import type { ElementRef } from "react";
import { forwardRef, useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { hapticImpactIfMobile } from "../hooks/hapticImpactIfMobile";
import type { PropsOf } from "./types";

export type ButtonVariant = `filled` | `outline` | `bare`;

export type RectButton2Props = {
  variant?: ButtonVariant;
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
    className,
    inFlexRowParent = false,
    textClassName,
    ...pressableProps
  },
  ref,
) {
  const disabled = pressableProps.disabled === true;

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
          variant,
          disabled,
          hoveredOrPressed: pressed || hovered,
          className,
        })}
      >
        {typeof children === `string` ? (
          <Text className={text({ variant, class: textClassName })}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
});

const pressable = tv({
  base: `web:transition-all`,
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
  base: `items-center justify-center rounded-lg px-3 py-[4px] web:transition-all`,
  variants: {
    variant: {
      filled: `py-[5px]`,
      outline: `border-2`,
      bare: ``,
    },
    hoveredOrPressed: {
      true: ``,
    },
    flat: {
      true: ``,
    },
    disabled: {
      true: `cursor-default select-none opacity-30`,
    },
  },
  compoundVariants: [
    {
      variant: `filled`,
      class: `border-background/20 bg-body/95`,
    },
    {
      variant: `filled`,
      hoveredOrPressed: true,
      class: `bg-body`,
    },
    {
      variant: `filled`,
      flat: false,
      class: `border-b-4`,
    },
    {
      variant: `outline`,
      class: `border-body/20`,
    },
    {
      variant: `outline`,
      disabled: false,
      hoveredOrPressed: true,
      class: `border-body/30`,
    },
    {
      variant: `outline`,
      flat: true,
      class: `border-b-2`,
    },
    {
      variant: `outline`,
      flat: false,
      class: `border-b-4`,
    },
  ],
});

const text = tv({
  base: `hhh-text-button select-none`,
  variants: {
    variant: {
      filled: `text-background`,
      outline: ``,
      bare: ``,
    },
  },
  compoundVariants: [
    {
      variant: [`outline`, `bare`],
      class: `text-body`,
    },
  ],
});
