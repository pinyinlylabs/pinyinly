import type { ReactNode } from "react";
import { Text } from "@/client/ui/Text";
import { Icon } from "./Icon";
import type { IconName } from "./iconRegistry";
import { View } from "@/client/ui/View";
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

type LozengeProps = {
  color: LozengeColor;
  size?: `sm` | `md`;
  className?: string;
  progress?: number;
  progressClassName?: string;
} & (
  | {
      kind?: `text`;
      children: ReactNode;
      icon?: never;
      accessibilityLabel?: never;
      iconTintColorClassName?: never;
    }
  | {
      kind: `icon`;
      icon: IconName;
      children?: never;
      accessibilityLabel?: string;
      iconTintColorClassName?: string;
    }
);

export function Lozenge(props: LozengeProps) {
  const {
    color,
    size = `md`,
    className,
    progress,
    progressClassName = `bg-blue/20`,
  } = props;
  const isIcon = props.kind === `icon`;

  return (
    <View
      accessible={isIcon}
      accessibilityLabel={isIcon ? props.accessibilityLabel : undefined}
      style={isIcon ? { width: 26, height: 26, padding: 0 } : undefined}
      className={lozengeContainerClass({
        color,
        size: isIcon ? undefined : size,
        className: [
          isIcon ? `flex-row items-center justify-center` : ``,
          progress == null ? `` : `relative overflow-hidden`,
          className,
        ]
          .filter(Boolean)
          .join(` `),
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
      {isIcon ? (
        <Icon
          icon={props.icon}
          size={16}
          tintColorClassName={props.iconTintColorClassName}
        />
      ) : (
        <Text
          className={`
            ${lozengeTextClass({ color, size })}
            ${progress == null ? `` : `relative`}
          `}
        >
          {props.children}
        </Text>
      )}
    </View>
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
