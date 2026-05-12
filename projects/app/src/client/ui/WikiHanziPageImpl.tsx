import type { HanziText } from "@/data/model";
import { WikiHanziBody } from "./WikiHanziBody";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  return <WikiHanziBody hanzi={hanzi} />;
}
