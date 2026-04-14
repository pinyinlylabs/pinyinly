import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export type LozengeColor =
  | `emerald`
  | `cyan`
  | `blue`
  | `violet`
  | `fuchsia`
  | `rose`
  | `orange`
  | `amber`;

export function Lozenge({
  children,
  color,
  size = `md`,
  className,
}: {
  children: string;
  color: LozengeColor;
  size?: `sm` | `md`;
  className?: string;
}) {
  return (
    <View className={lozengeContainerClass({ color, size, className })}>
      <Text className={lozengeTextClass({ color, size })}>{children}</Text>
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
    },
    size: {
      sm: `text-[10px]`,
      md: `text-[12px]`,
    },
  },
});
