import type { HskLevel } from "@/data/model";
import { Lozenge } from "./Lozenge";
import type { LozengeColor } from "./Lozenge";

export function HskLozenge({
  hskLevel,
  size = `md`,
}: {
  hskLevel: HskLevel;
  size?: `sm` | `md`;
}) {
  return (
    <Lozenge
      color={hskLevelToColor[hskLevel]}
      size={size}
    >{`HSK${hskLevel}`}</Lozenge>
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
} satisfies Record<HskLevel, LozengeColor>;
