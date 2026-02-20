import type { HskLevel } from "@/data/model";
import { Lozenge } from "./Lozenge";

export function HskLozenge({ hskLevel }: { hskLevel: HskLevel }) {
  return <Lozenge color="blue">{`HSK${hskLevel}`}</Lozenge>;
}
