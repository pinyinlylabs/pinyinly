import { useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { hapticImpactIfMobile } from "../hooks/hapticImpactIfMobile";
import type { PropsOf } from "./types";

export type ButtonVariant = `filled` | `outline` | `option` | `bare`;

export type RectButtonProps = {
  variant?: ButtonVariant;
  children?: ViewProps[`children`];
  className?: string;
  inFlexRowParent?: boolean;
  textClassName?: string;
} & Pick<
  PropsOf<typeof Pressable>,
  keyof PropsOf<typeof Pressable> & (`on${string}` | `disabled` | `ref`)
>;

export function RectButton({
  children,
  variant = `outline`,
  className,
  inFlexRowParent = false,
  textClassName,
  ...pressableProps
}: RectButtonProps) {
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
}

const pressable = tv({
  base: `web:transition-all`,
  variants: {
    flat: {
      true: ``,
    },
    variant: {
      filled: `
        rounded-xl

        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1
        focus-visible:outline-fg/75
      `,
      outline: `rounded-xl`,
      option: `
        rounded-xl

        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1
        focus-visible:outline-sky/75
      `,
      bare: ``,
    },
    inFlexRowParent: {
      true: `flex-row`,
    },
  },
  compoundVariants: [
    {
      variant: `filled`,
      flat: true,
      class: `pt-[4px]`,
    },
    {
      variant: `outline`,
      flat: true,
      class: `pt-[2px]`,
    },
    {
      variant: `option`,
      flat: true,
      class: `pt-[2px]`,
    },
  ],
});

const roundedRect = tv({
  base: `
    box-border select-none items-center justify-center

    web:transition-all
  `,
  variants: {
    variant: {
      filled: `rounded-xl border-bg/20 bg-fg/95 px-4 py-2`,
      outline: `rounded-xl border-2 border-fg/20 px-4 py-2`,
      option: `rounded-xl border border-fg/20 px-3 py-2`,
      bare: `px-2 py-1`,
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
      hoveredOrPressed: true,
      class: `bg-fg`,
    },
    {
      variant: `filled`,
      flat: false,
      class: `border-b-4`,
    },
    // Outline
    {
      variant: `outline`,
      disabled: false,
      hoveredOrPressed: true,
      class: `border-fg/30`,
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
    // Option
    {
      variant: `option`,
      disabled: false,
      hoveredOrPressed: true,
      class: `border-fg/30`,
    },
    {
      variant: `option`,
      flat: true,
      class: `border-b`,
    },
    {
      variant: `option`,
      flat: false,
      class: `border-b-[3px]`,
    },
  ],
});

const text = tv({
  variants: {
    variant: {
      filled: `hhh-button-filled`,
      outline: `hhh-button-outline`,
      option: `hhh-button-option`,
      bare: `hhh-button-bare`,
    },
  },
});
