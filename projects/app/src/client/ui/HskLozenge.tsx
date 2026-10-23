import type { Hsk30Level } from "@/data/model";
import { Text } from "@/client/ui/Text";
import { Lozenge } from "./Lozenge";
import type { LozengeColor, LozengePressableProps } from "./Lozenge";

export function HskLozenge({
  hskLevel,
  size = `md`,
  color,
  suffix,
  ...pressableProps
}: {
  hskLevel: Hsk30Level;
  size?: `sm` | `md`;
  color?: LozengeColor;
  suffix?: string;
} & LozengePressableProps) {
  color ??= hskLevelToColor[hskLevel];

  return (
    <Lozenge {...pressableProps} color={color} size={size}>
      <Text className={size == `sm` ? `opacity-80` : undefined}>HSK</Text>
      {` `}
      {hskLevel}
      {suffix}
    </Lozenge>
  );
}

const hskLevelToColor = {
  [`1`]: `emerald`,
  [`2`]: `cyan`,
  [`3`]: `blue`,
  [`4`]: `fuchsia`,
  [`5`]: `rose`,
  [`6`]: `orange`,
  [`7-9`]: `amber`,
} satisfies Record<Hsk30Level, LozengeColor>;
