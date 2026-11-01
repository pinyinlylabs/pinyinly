import { hapticImpactIfMobile } from "@/client/ui/hooks/hapticImpactIfMobile";
import { usePreventPressFocusRef } from "@/client/ui/hooks/usePreventPressFocusRef";
import type { PropsOf } from "@pinyinly/lib/types";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { tv } from "tailwind-variants";
import type { IconProps } from "./Icon";
import { Icon } from "./Icon";
import type { IconName } from "./iconRegistry";
import { mergeRefs } from "@/client/react";

export type ButtonVariant =
  | `filled`
  | `outline`
  | `option`
  | `barePrimary`
  | `bare`
  | `bareDim`
  | `rounded`;

export type RectButtonProps = {
  /** If true, the button should look like it's "turned on" / "lit up". Not implemented for all variants. */
  active?: boolean;
  variant?: ButtonVariant;
  children?: ViewProps[`children`];
  className?: string;
  href?: Href;
  inFlexRowParent?: boolean;
  iconStart?: IconName;
  iconEnd?: IconName;
  iconSize?: IconProps[`size`];
  pressed?: boolean;
  /** Allow selecting the button label. Defaults to false. */
  selectable?: boolean;
  /** Prevent touch events from moving focus to the button, this is useful for buttons serve as controls for text inputs. */
  preventPressFocus?: boolean;
} & Pick<
  PropsOf<typeof Pressable>,
  | (keyof PropsOf<typeof Pressable> & `on${string}`)
  | `accessibilityLabel`
  | `accessibilityRole`
  | `aria-checked`
  | `disabled`
  | `ref`
  | `tabIndex`
  | `testID`
>;

export function RectButton({
  active = false,
  children,
  variant = `outline`,
  className,
  href,
  inFlexRowParent = false,
  iconStart,
  iconEnd,
  iconSize,
  accessibilityRole,
  pressed: pressedProp,
  selectable = false,
  preventPressFocus = false,
  ...pressableProps
}: RectButtonProps) {
  const disabled = pressableProps.disabled === true;
  const iconOnly = children == null && (iconStart != null || iconEnd != null);
  const resolvedIconSize = iconSize ?? iconSizeByVariant[variant];

  const [pressedState, setPressedState] = useState(false);
  const [hoveredState, setHoveredState] = useState(false);

  const pressed = !disabled && (pressedProp ?? pressedState);
  const hovered = !disabled && hoveredState;

  const textClassName = extractTextClasses(className);
  const fullTextClass = textClass({
    variant,
    selectable,
    class: textClassName,
  });
  const content =
    children == null ? null : (
      <Text selectable={selectable} className={fullTextClass}>
        {children}
      </Text>
    );

  const preventPressFocusRef = usePreventPressFocusRef();

  const pressable = (
    <Pressable
      {...pressableProps}
      ref={mergeRefs(
        preventPressFocus ? preventPressFocusRef : undefined,
        pressableProps.ref,
      )}
      accessibilityRole={
        accessibilityRole ?? (href == null ? `button` : `link`)
      }
      onHoverIn={(e) => {
        setHoveredState(true);
        pressableProps.onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHoveredState(false);
        pressableProps.onHoverOut?.(e);
      }}
      onPressIn={(e) => {
        setPressedState(true);
        hapticImpactIfMobile();
        pressableProps.onPressIn?.(e);

        // A side effect of preventPressFocus is that we manually trigger onPress here, otherwise onPress is never called.
        // See useTouchStartPreventDefaultRef for details.
        if (preventPressFocus) {
          pressableProps.onPress?.(e);
        }
      }}
      onPressOut={(e) => {
        setPressedState(false);
        pressableProps.onPressOut?.(e);
      }}
      className={buttonSlotClass({
        variant,
        disabled,
        inFlexRowParent,
        className,
      })}
    >
      <View
        className={buttonUiClass({
          active,
          className,
          disabled,
          hoveredOrPressed: hovered || pressed,
          iconOnly,
          pressed,
          variant,
        })}
      >
        {iconStart == null && iconEnd == null ? (
          content
        ) : (
          <View className={iconLayoutClass({ variant })}>
            {iconStart == null ? null : (
              <Icon
                icon={iconStart}
                tintColorClassName={iconTintClass({ variant })}
                size={resolvedIconSize}
              />
            )}
            {content}
            {iconEnd == null ? null : (
              <Icon
                icon={iconEnd}
                tintColorClassName={iconTintClass({ variant })}
                size={resolvedIconSize}
              />
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

const iconSizeByVariant: Partial<Record<ButtonVariant, IconProps[`size`]>> = {
  bareDim: 20,
};

const buttonSlotClass = tv({
  base: `
    outline-transparent

    focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue/50

    web:transition-all
  `,
  variants: {
    variant: {
      filled: `
        rounded-xl pb-[3px]

        focus-visible:outline-fg/50
      `,
      outline: `rounded-xl pb-0.5`,
      option: `rounded-xl pb-0.5`,
      barePrimary: `rounded transition-transform`,
      bare: `rounded transition-transform`,
      bareDim: `rounded transition-transform`,
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
      variant: `rounded`,
      disabled: false,
      class: `active:scale-95`,
    },
    {
      variant: `bare`,
      disabled: false,
      class: `active:scale-[98%]`,
    },
    {
      variant: `barePrimary`,
      disabled: false,
      class: `active:scale-[98%]`,
    },
    {
      variant: `bareDim`,
      disabled: false,
      class: `active:scale-[98%]`,
    },
  ],
});

const buttonUiClass = tv({
  base: `
    box-border items-center justify-center select-none

    web:transition-[border-color,box-shadow,translate] web:duration-100 web:ease-in-out
  `,
  variants: {
    variant: {
      filled: `
        rounded-xl bg-fg/95 px-4 py-2
        shadow-[0_3px_0_color-mix(in_oklab,var(--color-bg)_30%,var(--color-fg))]
      `,
      outline: `
        rounded-xl border-2 border-fg/20 px-4 py-2
        shadow-[0_2px_0_color-mix(in_oklab,var(--color-fg)_20%,transparent)]
      `,
      option: `
        rounded-xl border border-fg/20 px-3 py-2
        shadow-[0_2px_0_color-mix(in_oklab,var(--color-fg)_20%,transparent)]
      `,
      barePrimary: `rounded bg-blue px-2 py-1`,
      bare: `rounded px-2 py-1`,
      bareDim: `rounded px-2 py-1`,
      rounded: `rounded-full border border-fg/20 px-4 py-2`,
    },
    active: {
      true: ``,
    },
    pressed: {
      true: ``,
    },
    hoveredOrPressed: {
      true: ``,
    },
    disabled: {
      true: `cursor-default opacity-30 select-none`,
    },
    iconOnly: {
      true: ``,
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
      pressed: true,
      class: `translate-y-[3px] shadow-none`,
    },
    // Outline
    {
      variant: `outline`,
      hoveredOrPressed: true,
      class: `border-fg/30 shadow-[0_2px_0_color-mix(in_oklab,var(--color-fg)_30%,transparent)]`,
    },
    {
      variant: `outline`,
      active: true,
      class: `border-fg/100 shadow-[0_2px_0_color-mix(in_oklab,var(--color-fg)_100%,transparent)]`,
    },
    {
      variant: `outline`,
      pressed: true,
      class: `translate-y-[2px] shadow-none`,
    },
    // Option
    {
      variant: `option`,
      hoveredOrPressed: true,
      class: `border-fg/30 shadow-[0_2px_0_color-mix(in_oklab,var(--color-fg)_30%,transparent)]`,
    },
    {
      variant: `option`,
      active: true,
      class: `border-fg shadow-[0_2px_0_color-mix(in_oklab,var(--color-fg)_100%,transparent)]`,
    },
    {
      variant: `option`,
      pressed: true,
      class: `translate-y-[2px] shadow-none`,
    },
    // Rounded
    {
      variant: `rounded`,
      hoveredOrPressed: true,
      class: `border-fg/30`,
    },
    // Bare
    {
      variant: `bare`,
      hoveredOrPressed: true,
      class: `bg-fg/10`,
    },
    // BarePrimary
    {
      variant: `barePrimary`,
      hoveredOrPressed: true,
      class: `bg-blue/90`,
    },
    // BareDim
    {
      variant: `bareDim`,
      hoveredOrPressed: true,
      class: `bg-fg/10`,
    },
    // Icon-only: reduce horizontal padding to match vertical for a square appearance
    { variant: `filled`, iconOnly: true, class: `px-2` },
    { variant: `outline`, iconOnly: true, class: `px-2` },
    { variant: `option`, iconOnly: true, class: `px-2` },
    { variant: `barePrimary`, iconOnly: true, class: `px-1` },
    { variant: `bare`, iconOnly: true, class: `px-1` },
    { variant: `bareDim`, iconOnly: true, class: `px-1` },
    { variant: `rounded`, iconOnly: true, class: `px-2` },
  ],
});

const textClass = tv({
  variants: {
    selectable: {
      true: `web:select-text web:[-webkit-touch-callout:default]`,
      false: `
        web:select-none web:[-webkit-touch-callout:none]

        web:[&_*]:select-none
      `,
    },
    variant: {
      filled: `font-sans text-base/snug font-bold text-bg uppercase`,
      outline: `pyly-button-outline`,
      option: `font-sans text-base/snug font-medium text-fg`,
      bare: `font-sans text-sm/normal font-bold text-fg uppercase`,
      barePrimary: `font-sans text-sm/normal font-semibold text-bg uppercase`,
      bareDim: `font-sans text-sm/normal font-semibold text-muted-fg uppercase`,
      rounded: `font-sans text-[13px] font-semibold text-fg uppercase`,
    },
  },
});

const iconTintClass = tv({
  variants: {
    variant: {
      filled: `accent-bg`,
      outline: `accent-fg`,
      option: `accent-fg`,
      bare: `accent-fg`,
      barePrimary: `accent-bg`,
      bareDim: `accent-muted-fg`,
      rounded: `accent-fg`,
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
    .split(/\s+/u)
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
      barePrimary: `gap-2`,
      bare: `gap-2`,
      bareDim: `gap-2`,
      filled: ``,
      outline: ``,
      option: ``,
      rounded: ``,
    },
  },
});
