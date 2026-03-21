import { matchAllHanziCharacters } from "@/data/hanzi";
import type { HanziCharacter, HanziText } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

export function WikiHanziWordCharacters({ hanzi }: { hanzi: HanziText }) {
  const characters = matchAllHanziCharacters(hanzi);

  if (characters.length < 2) {
    return null;
  }

  return (
    <WikiTitledBox title="Characters" className="mx-4">
      <View className="flex-row flex-wrap gap-2 p-4">
        {characters.map((char) => (
          <CharacterTile key={char} char={char} />
        ))}
      </View>
    </WikiTitledBox>
  );
}

function CharacterTile({ char }: { char: HanziCharacter }) {
  const db = useDb();
  const { data: entries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, char)),
    [db.dictionarySearch, char],
  );

  const pinyin = entries[0]?.pinyin?.[0];
  const gloss = entries[0]?.gloss[0];

  return (
    <Link href={`/wiki/${encodeURIComponent(char)}`} asChild>
      <View className="min-w-[72px] flex-1 items-center gap-1 rounded-lg bg-fg/5 p-3">
        <Text className="font-sans text-[32px] font-semibold leading-none text-fg-loud">
          {char}
        </Text>
        {pinyin == null ? null : (
          <Text className="font-sans text-xs text-fg-dim">{pinyin}</Text>
        )}
        {gloss == null ? null : (
          <Text
            className="text-center font-sans text-xs text-fg"
            numberOfLines={2}
          >
            {gloss}
          </Text>
        )}
      </View>
    </Link>
  );
}
