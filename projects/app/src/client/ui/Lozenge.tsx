import type { ReactNode } from "react";
import { Text } from "@/client/ui/Text";
import { Icon } from "./Icon";
import type { IconName } from "./iconRegistry";
import { View } from "@/client/ui/View";
import type { PropsOf } from "@pinyinly/lib/types";
import { Pressable } from "react-native";
import { tv } from "tailwind-variants";

export type LozengeColor =
  | `emerald`
  | `cyan`
  | `blue`
  | `violet`
  | `fuchsia`
  | `rose`
  | `orange`
  | `amber`
  | `muted-fg`;

export type LozengePressableProps = Pick<
  PropsOf<typeof Pressable>,
  | (keyof PropsOf<typeof Pressable> & (`on${string}` | `disabled` | `ref`))
  | `accessibilityLabel`
  | `accessibilityRole`
>;

type LozengeBaseProps = LozengePressableProps & {
  color: LozengeColor;
  className?: string;
};

type LozengeProps =
  | (LozengeBaseProps & {
      kind?: `text`;
      size?: `sm` | `md`;
      progress?: number;
      progressClassName?: string;
      children: ReactNode;
      icon?: never;
      iconTintColorClassName?: never;
    })
  | (LozengeBaseProps & {
      kind: `icon`;
      icon: IconName;
      children?: never;
      iconTintColorClassName?: string;
    });

export function Lozenge(props: LozengeProps) {
  return props.kind === `icon` ? (
    <IconLozenge {...props} />
  ) : (
    <TextLozenge {...props} />
  );
}

function IconLozenge({
  color,
  className,
  icon,
  iconTintColorClassName,
  ...pressableProps
}: LozengeBaseProps & {
  icon: IconName;
  iconTintColorClassName?: string;
}) {
  const Container = pressableProps.onPress == null ? View : Pressable;

  return (
    <Container
      {...pressableProps}
      accessible
      style={{ width: 28, height: 26, padding: 0 }}
      className={lozengeContainerClass({
        color,
        interactive: pressableProps.onPress != null,
        className: [`flex-row items-center justify-center`, className],
      })}
    >
      <Icon icon={icon} size={16} tintColorClassName={iconTintColorClassName} />
    </Container>
  );
}

function TextLozenge({
  color,
  size = `md`,
  className,
  progress,
  progressClassName = `bg-blue/20`,
  children,
  ...pressableProps
}: LozengeBaseProps & {
  size?: `sm` | `md`;
  progress?: number;
  progressClassName?: string;
  children: ReactNode;
}) {
  const Container = pressableProps.onPress == null ? View : Pressable;

  return (
    <Container
      {...pressableProps}
      accessible={pressableProps.accessibilityLabel != null}
      className={lozengeContainerClass({
        color,
        size,
        interactive: pressableProps.onPress != null,
        className: [
          progress == null ? `` : `relative overflow-hidden`,
          className,
        ],
      })}
    >
      {progress == null || progress <= 0 ? null : (
        <View
          className={`
            absolute inset-y-0 left-0

            ${progressClassName}
          `}
          style={{ width: `${Math.min(progress, 1) * 100}%` }}
        />
      )}
      <Text
        className={`
          ${lozengeTextClass({ color, size })}
          ${progress == null ? `` : `relative`}
        `}
      >
        {children}
      </Text>
    </Container>
  );
}

const lozengeContainerClass = tv({
  base: `rounded-md border`,
  variants: {
    color: {
      emerald: `border-lozenge-emerald-border bg-lozenge-emerald-bg`,
      cyan: `border-lozenge-cyan-border bg-lozenge-cyan-bg`,
      blue: `border-lozenge-blue-border bg-lozenge-blue-bg`,
      violet: `border-lozenge-violet-border bg-lozenge-violet-bg`,
      fuchsia: `border-lozenge-fuchsia-border bg-lozenge-fuchsia-bg`,
      rose: `border-lozenge-rose-border bg-lozenge-rose-bg`,
      orange: `border-lozenge-orange-border bg-lozenge-orange-bg`,
      amber: `border-lozenge-amber-border bg-lozenge-amber-bg`,
      "muted-fg": `border-muted-fg/0 bg-muted-fg/10`,
    },
    size: {
      sm: `px-1.5 py-0.5`,
      md: `px-2 py-1`,
    },
    interactive: {
      true: `
        outline-transparent

        hover:opacity-90

        focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue/50

        active:opacity-80
      `,
    },
  },
});

const lozengeTextClass = tv({
  base: `font-sans font-semibold`,
  variants: {
    color: {
      emerald: `text-lozenge-emerald-fg`,
      cyan: `text-lozenge-cyan-fg`,
      blue: `text-lozenge-blue-fg`,
      violet: `text-lozenge-violet-fg`,
      fuchsia: `text-lozenge-fuchsia-fg`,
      rose: `text-lozenge-rose-fg`,
      orange: `text-lozenge-orange-fg`,
      amber: `text-lozenge-amber-fg`,
      "muted-fg": `text-muted-fg`,
    },
    size: {
      sm: `text-[10px]`,
      md: `text-[12px]`,
    },
  },
});
