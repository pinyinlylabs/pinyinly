import type { HanziText } from "@/data/model";
import { isHanziCharacter } from "@/data/hanzi";
import { WikiHanziBodyCharacter } from "./WikiHanziBodyCharacter";
import { WikiHanziBodyWord } from "./WikiHanziBodyWord";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziBodyCharacterMultipleMeanings } from "./WikiHanziBodyCharacterMultipleMeanings";

export function WikiHanziBody({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();

  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionaryCollection, hanzi],
  );

  return isHanziCharacter(hanzi) ? (
    dictionaryEntries.length === 1 ? (
      <WikiHanziBodyCharacter hanzi={hanzi} />
    ) : (
      <WikiHanziBodyCharacterMultipleMeanings hanzi={hanzi} />
    )
  ) : (
    <WikiHanziBodyWord hanzi={hanzi} />
  );
}
