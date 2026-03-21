import type { HanziWord } from "@/data/model";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { useLiveQuery, inArray } from "@tanstack/react-db";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useDb } from "./hooks/useDb";

export function GroupedHanziWords({
  hanziWords,
}: {
  hanziWords: readonly HanziWord[];
}) {
  const db = useDb();
  const { data: rows } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => inArray(entry.hanziWord, hanziWords))
        // Then by character count
        .orderBy(({ entry }) => entry.hanziCharacterCount, `asc`)
        // Sort lexically first (lowest priority)
        .orderBy(({ entry }) => entry.hanzi, `asc`),
    [db.dictionarySearch, hanziWords],
  );

  const filteredRows = rows.filter(
    arrayFilterUnique((entry) => entry.hanziWord),
  );

  return (
    <View className="gap-2">
      {filteredRows.map((entry) => (
        <Link
          href={`/wiki/${encodeURIComponent(entry.hanzi)}`}
          asChild
          key={entry.hanziWord}
        >
          <Pressable
            className={`
              flex-row items-center gap-3 rounded-xl border border-fg/10 bg-bg-high px-4 py-3

              hover:bg-fg/5
            `}
          >
            <Text className="text-2xl font-semibold text-fg-loud">
              {entry.hanzi}
            </Text>
            <View className="flex-1">
              {entry.gloss[0] == null ? null : (
                <Text className="text-sm text-fg">{entry.gloss[0]}</Text>
              )}
              {entry.pinyin?.[0] == null ? null : (
                <Text className="text-xs text-fg-dim">{entry.pinyin[0]}</Text>
              )}
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
