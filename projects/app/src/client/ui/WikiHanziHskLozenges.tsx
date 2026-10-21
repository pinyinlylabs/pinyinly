import type { HanziText } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { HskLozengeWithTooltip } from "./HskLozengeWithTooltip";
import { useDb } from "./hooks/useDb";

export function WikiHanziHskLozenges({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();
  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionaryCollection, hanzi],
  );

  return <HskLozengeWithTooltip entries={dictionaryEntries} />;
}
