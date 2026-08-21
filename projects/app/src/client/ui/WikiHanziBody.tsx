import type { HanziText } from "@/data/model";
import { isHanziCharacter } from "@/data/hanzi";
import { WikiHanziBodyCharacter } from "./WikiHanziBodyCharacter";
import { WikiHanziBodyWord } from "./WikiHanziBodyWord";

export function WikiHanziBody({ hanzi }: { hanzi: HanziText }) {
  return isHanziCharacter(hanzi) ? (
    <WikiHanziBodyCharacter hanzi={hanzi} />
  ) : (
    <WikiHanziBodyWord hanzi={hanzi} />
  );
}
