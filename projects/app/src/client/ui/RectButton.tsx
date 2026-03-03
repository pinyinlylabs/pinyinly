import { hapticImpactIfMobile } from "@/client/ui/hooks/hapticImpactIfMobile";
import type { PropsOf } from "@pinyinly/lib/types";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { useState } from "react";
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
  href?: Href;
  inFlexRowParent?: boolean;
  iconStart?: IconName;
  iconEnd?: IconName;
  iconSize?: IconProps[`size`];
  /**
   * @deprecated Use a `variant` to control styling or use a different component.
   */
  rawChildren?: boolean;
} & Pick<
  PropsOf<typeof Pressable>,
  keyof PropsOf<typeof Pressable> & (`on${string}` | `disabled` | `ref`)
>;

export function RectButton({
  children,
  variant = `outline`,
  className,
  href,
  inFlexRowParent = false,
  iconStart,
  iconEnd,
  iconSize,
  // oxlint-disable-next-line typescript/no-deprecated
  rawChildren = false,
  ...pressableProps
}: RectButtonProps) {
  const disabled = pressableProps.disabled === true;

  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const flat = pressed || disabled;
  const textClassName = extractTextClasses(className);
  const content = rawChildren ? (
    children
  ) : children == null ? null : (
    <Text className={textClass({ variant, class: textClassName })}>
      {children}
    </Text>
  );

  const pressable = (
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
      className={pressableClass({
        flat,
        variant,
        disabled,
        inFlexRowParent,
        className,
      })}
    >
      <View
        className={roundedRectClass({
          flat,
          variant,
          disabled,
          hoveredOrPressed: pressed || hovered,
          className,
        })}
      >
        {iconStart == null && iconEnd == null ? (
          content
        ) : (
          <View className={iconLayoutClass({ variant })}>
            {iconStart == null ? null : (
              <Icon
                icon={iconStart}
                className={textClassName}
                size={iconSize}
              />
            )}
            {content}
            {iconEnd == null ? null : (
              <Icon icon={iconEnd} className={textClassName} size={iconSize} />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );

  return href == null ? (
    pressable
  ) : (
    <Link href={href} asChild>
      {pressable}
    </Link>
  );
}

const pressableClass = tv({
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

const roundedRectClass = tv({
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

const textClass = tv({
  variants: {
    variant: {
      filled: `font-sans text-base/snug font-bold uppercase text-bg`,
      outline: `pyly-button-outline`,
      option: `font-sans text-base/snug font-medium text-fg`,
      bare: `font-sans text-sm/normal font-bold uppercase text-fg`,
      bare2: `font-sans text-sm/normal font-bold uppercase text-fg`,
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

const iconLayoutClass = tv({
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
