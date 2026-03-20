import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { Link } from "expo-router";
import { use } from "react";
import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText, HanziWord } from "@/data/model";
import { and, eq, like, not, useLiveQuery } from "@tanstack/react-db";
import { Pressable, Text, View } from "react-native";
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
        .select(({ entry }) => ({ hanziWord: entry.hanziWord }))
        .distinct()
        .limit(maxUsedInWords),
    [db.dictionarySearch, hanzi],
  );

  if (!isHanziCharacter(hanzi)) {
    return null;
  }

  const hanziWords = dictionarySearchEntries.map((entry) => entry.hanziWord);

  if (hanziWords.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Used in words" className="mx-4">
      <View className="gap-1 p-3">
        <CompactWordRows hanziWords={hanziWords} />
      </View>
    </WikiTitledBox>
  );
}

function CompactWordRows({ hanziWords }: { hanziWords: readonly HanziWord[] }) {
  const dictionary = use(loadDictionary());

  return hanziWords.map((hanziWord) => {
    const hanzi = hanziFromHanziWord(hanziWord);
    const meaning = dictionary.lookupHanziWord(hanziWord);
    const pinyin = meaning?.pinyin?.[0];
    const gloss = meaning?.gloss[0];

    return (
      <Link href={`/wiki/${encodeURIComponent(hanzi)}`} asChild key={hanziWord}>
        <Pressable className="flex-row items-center py-1.5">
          <View className="flex-row items-baseline gap-2">
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
