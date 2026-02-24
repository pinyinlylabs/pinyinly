import { hapticImpactIfMobile } from "@/client/ui/hooks/hapticImpactIfMobile";
import type { PropsOf } from "@pinyinly/lib/types";
import { isValidElement, useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import type { IconProps } from "./Icon";
import { Icon } from "./Icon";
import type { IconName } from "./iconRegistry";

export type ButtonVariant =
  | `filled`
  | `outline`
  | `option`
  | `bare`
  | `bare2`
  | `rounded`;

export type RectButtonProps = {
  variant?: ButtonVariant;
  children?: ViewProps[`children`];
  className?: string;
  inFlexRowParent?: boolean;
  iconStart?: IconName;
  iconEnd?: IconName;
  iconSize?: IconProps[`size`];
} & Pick<
  PropsOf<typeof Pressable>,
  keyof PropsOf<typeof Pressable> & (`on${string}` | `disabled` | `ref`)
>;

export function RectButton({
  children,
  variant = `outline`,
  className,
  inFlexRowParent = false,
  iconStart,
  iconEnd,
  iconSize,
  ...pressableProps
}: RectButtonProps) {
  const disabled = pressableProps.disabled === true;

  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const flat = pressed || disabled;
  const textClassName = extractTextClasses(className);
  const hasChildren = children != null;
  const textContent = isValidElement(children) ? (
    children
  ) : hasChildren ? (
    <Text className={text({ variant, class: textClassName })}>{children}</Text>
  ) : null;

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
      className={pressable({
        flat,
        variant,
        disabled,
        inFlexRowParent,
        className,
      })}
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
        {iconStart == null && iconEnd == null ? (
          textContent
        ) : (
          <View className={iconLayout({ variant })}>
            {iconStart == null ? null : (
              <Icon
                icon={iconStart}
                className={textClassName}
                size={iconSize}
              />
            )}
            {textContent}
            {iconEnd == null ? null : (
              <Icon icon={iconEnd} className={textClassName} size={iconSize} />
            )}
          </View>
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
      bare: `transition-transform`,
      bare2: `transition-transform`,
      rounded: `rounded-full transition-transform`,
    },
    inFlexRowParent: {
      true: `flex-row`,
    },
    disabled: {
      true: ``,
      false: ``,
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
    {
      variant: `rounded`,
      disabled: false,
      class: `active:scale-95`,
    },
    {
      variant: `bare`,
      disabled: false,
      class: `
        opacity-75

        hover:opacity-100

        active:scale-95
      `,
    },
    {
      variant: `bare2`,
      disabled: false,
      class: `active:scale-[98%]`,
    },
  ],
});

const roundedRect = tv({
  base: `
    box-border select-none items-center justify-center

    web:transition-[border-width]
  `,
  variants: {
    variant: {
      filled: `rounded-xl border-bg/20 bg-fg/95 px-4 py-2`,
      outline: `rounded-xl border-2 border-fg/20 px-4 py-2`,
      option: `rounded-xl border border-fg/20 px-3 py-2`,
      bare: `px-2 py-1`,
      bare2: `rounded px-2 py-1`,
      rounded: `rounded-full border border-fg/20 px-4 py-2`,
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
    // Filled
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
    // Rounded
    {
      variant: `rounded`,
      disabled: false,
      hoveredOrPressed: true,
      class: `border-fg/30`,
    },
    // Bare2
    {
      variant: `bare2`,
      hoveredOrPressed: true,
      class: `bg-fg/10`,
    },
  ],
});

const text = tv({
  variants: {
    variant: {
      filled: `pyly-button-filled`,
      outline: `pyly-button-outline`,
      option: `pyly-button-option`,
      bare: `pyly-button-bare`,
      bare2: `pyly-button-bare2`,
      rounded: `font-sans text-[13px] font-semibold uppercase text-fg`,
    },
  },
});

const textClassPrefixList = [
  `text-`,
  `font-`,
  `leading-`,
  `tracking-`,
  `uppercase`,
  `lowercase`,
  `capitalize`,
  `underline`,
  `line-through`,
  `italic`,
  `not-italic`,
  `tabular-nums`,
  `lining-nums`,
  `normal-nums`,
  `ordinal`,
  `slashed-zero`,
];

const extractTextClasses = (className?: string) => {
  if (className == null || className.trim() === ``) {
    return;
  }

  const classes = className
    .split(/\s+/)
    .filter((classToken) =>
      textClassPrefixList.some((prefix) => classToken.startsWith(prefix)),
    )
    .join(` `);

  return classes === `` ? undefined : classes;
};

const iconLayout = tv({
  base: `flex-row items-center`,
  variants: {
    variant: {
      bare: `gap-2`,
      bare2: `gap-2`,
      filled: ``,
      outline: ``,
      option: ``,
      rounded: ``,
    },
  },
});
