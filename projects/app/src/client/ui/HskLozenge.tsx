import type { Hsk30Level } from "@/data/model";
import { Lozenge } from "./Lozenge";
import type { LozengeColor } from "./Lozenge";
import { Text } from "@/client/ui/Text";

export function HskLozenge({
  hskLevel,
  size = `md`,
  color,
}: {
  hskLevel: Hsk30Level;
  size?: `sm` | `md`;
  color?: LozengeColor;
}) {
  color ??= hskLevelToColor[hskLevel];

  return (
    <Lozenge color={color} size={size}>
      <Text className={size == `sm` ? `opacity-80` : undefined}>HSK</Text>
      {` `}
      {hskLevel}
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
