import type { HskLevel } from "@/data/model";
import { Lozenge } from "./Lozenge";

export function HskLozenge({
  hskLevel,
  size = `md`,
}: {
  hskLevel: HskLevel;
  size?: `sm` | `md`;
}) {
  return <Lozenge color="blue" size={size}>{`HSK${hskLevel}`}</Lozenge>;
}
