import type { HanziText } from "@/data/model";
import { and, eq, inArray, not, useLiveQuery } from "@tanstack/react-db";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { View } from "react-native";
import { CompactWordRows } from "./CompactWordRows";
import type { CompactWordRowsEntry } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxSamePronunciationEntries = 5;

export function WikiHanziSamePronunciation({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();

  const { data: currentEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.freq, {
          direction: `desc`,
          nulls: `last`,
        }),
    [db.dictionarySearch, hanzi],
  );

  const primaryPinyin = currentEntries[0]?.pinyin?.[0];

  const { data: matchingEntries } = useLiveQuery(
    (q) => {
      if (primaryPinyin == null) {
        return null;
      }

      return q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) =>
          and(
            not(eq(entry.hanzi, hanzi)),
            inArray(primaryPinyin, entry.pinyin),
          ),
        )
        .orderBy(({ entry }) => entry.freq, {
          direction: `desc`,
          nulls: `last`,
        });
    },
    [db.dictionarySearch, hanzi, primaryPinyin],
  );

  if (primaryPinyin == null) {
    return null;
  }

  const samePronunciationRows: CompactWordRowsEntry[] = (matchingEntries ?? [])
    .filter(arrayFilterUnique((entry) => entry.hanziWord))
    .slice(0, maxSamePronunciationEntries)
    .map((entry) => ({
      hanzi: entry.hanzi,
      hanziWord: entry.hanziWord,
      hsk: entry.hsk ?? null,
      gloss: entry.gloss,
      pinyin: entry.pinyin ?? null,
    }));

  if (samePronunciationRows.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Same pronunciation">
      <View className="p-3">
        <CompactWordRows dictionarySearchEntries={samePronunciationRows} />
      </View>
    </WikiTitledBox>
  );
}
