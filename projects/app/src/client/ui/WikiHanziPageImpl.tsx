import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziBody } from "./WikiHanziBody";
import { WikiHanziHeaderOverview } from "./WikiHanziHeaderOverview";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();

  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionarySearch, hanzi],
  );

  const hskLevels = dictionarySearchEntries
    .map((entry) => entry.hsk)
    .filter((x) => x != null)
    .filter(arrayFilterUnique())
    .sort(sortComparatorNumber(hskLevelToNumber));
  const pinyins = dictionarySearchEntries
    .map((entry) => entry.pinyin?.[0])
    .filter((x) => x != null);
  const glosses = dictionarySearchEntries
    .map((entry) => entry.gloss[0])
    .filter((x) => x != null);

  return (
    <>
      <WikiHanziHeaderOverview
        hanzi={hanzi}
        pinyins={pinyins}
        glosses={glosses}
        hskLevels={hskLevels}
      />

      <WikiHanziBody hanzi={hanzi} />
    </>
  );
}
