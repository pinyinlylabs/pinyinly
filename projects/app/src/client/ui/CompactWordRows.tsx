import { hanziFromHanziWord } from "@/dictionary";
import type { DictionarySearchEntry } from "@/client/query";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";
import { Icon } from "./Icon";

export type CompactWordRowsEntry = Pick<
  DictionarySearchEntry,
  `hanziWord` | `hsk` | `gloss` | `pinyin`
>;

export function CompactWordRows({
  dictionarySearchEntries,
}: {
  dictionarySearchEntries: readonly CompactWordRowsEntry[];
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
            <Text className="font-sans text-lg font-normal text-fg-loud">
              {hanzi}
            </Text>
            {pinyin == null ? null : (
              <Text className="font-sans text-sm text-fg-dim">{pinyin}</Text>
            )}
          </View>

          {gloss == null ? null : (
            <Text
              className="ml-4 flex-1 text-right font-sans text-sm text-fg"
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
