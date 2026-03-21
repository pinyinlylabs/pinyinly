import { hanziFromHanziWord } from "@/dictionary";
import { Link } from "expo-router";
import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText, HanziWord, HskLevel } from "@/data/model";
import { and, eq, like, not, useLiveQuery } from "@tanstack/react-db";
import { Pressable, Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";
import { Icon } from "./Icon";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxUsedInWords = 5;

export function WikiHanziCharacterUsedInWords({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) =>
          and(like(entry.hanzi, `%${hanzi}%`), not(eq(entry.hanzi, hanzi))),
        )
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziCharacterCount, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          hsk: entry.hsk,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        }))
        .distinct()
        .limit(maxUsedInWords),
    [db.dictionarySearch, hanzi],
  );

  if (!isHanziCharacter(hanzi)) {
    return null;
  }

  if (dictionarySearchEntries.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Used in words" className="mx-4">
      <View className="gap-1 p-3">
        <CompactWordRows dictionarySearchEntries={dictionarySearchEntries} />
      </View>
    </WikiTitledBox>
  );
}

function CompactWordRows({
  dictionarySearchEntries,
}: {
  dictionarySearchEntries: readonly {
    hanziWord: HanziWord;
    hsk?: HskLevel;
    gloss: string[];
    pinyin?: string[];
  }[];
}) {
  return dictionarySearchEntries.map((entry) => {
    const hanzi = hanziFromHanziWord(entry.hanziWord);
    const pinyin = entry.pinyin?.[0];
    const gloss = entry.gloss[0];

    return (
      <Link
        href={`/wiki/${encodeURIComponent(hanzi)}`}
        asChild
        key={entry.hanziWord}
      >
        <Pressable className="flex flex-row items-center gap-2 py-1.5">
          {entry.hsk == null ? null : (
            <HskLozenge hskLevel={entry.hsk} size="sm" />
          )}
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="text-lg font-normal text-fg-loud">{hanzi}</Text>
            {pinyin == null ? null : (
              <Text className="text-xs text-fg-dim">{pinyin}</Text>
            )}
          </View>

          {gloss == null ? null : (
            <Text
              className="ml-4 flex-1 text-right text-sm text-fg"
              numberOfLines={2}
            >
              {gloss}
            </Text>
          )}

          <Icon icon="chevron-right" size={12} className="ml-2 text-fg-dim" />
        </Pressable>
      </Link>
    );
  });
}
