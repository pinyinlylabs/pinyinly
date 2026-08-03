import type { DictionarySearchEntry } from "@/client/query";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { HanziPinyinText } from "./HanziPinyinText";
import { HskLozenge } from "./HskLozenge";
import { Icon } from "./Icon";

export interface CompactWordRowsEntry {
  hanzi: DictionarySearchEntry[`hanzi`];
  hanziWord: DictionarySearchEntry[`hanziWord`] | undefined | null;
  hsk: DictionarySearchEntry[`hsk`] | undefined | null;
  gloss: DictionarySearchEntry[`gloss`] | undefined | null;
  pinyin: DictionarySearchEntry[`pinyin`] | undefined | null;
}

export function CompactWordRows({
  dictionarySearchEntries,
}: {
  dictionarySearchEntries: readonly CompactWordRowsEntry[];
}) {
  return (
    <View className="-my-1.5 gap-1">
      {dictionarySearchEntries.map((entry, i) => {
        const hanzi = entry.hanzi;
        const pinyin = entry.pinyin?.[0];
        const gloss = entry.gloss?.[0];

        return (
          <Link href={`/wiki/${encodeURIComponent(hanzi)}`} asChild key={i}>
            <Pressable className="flex flex-row items-center gap-2 py-1.5">
              <HanziPinyinText
                hanzi={hanzi}
                pinyin={pinyin}
                lozenges={
                  entry.hsk == null ? null : (
                    <HskLozenge hskLevel={entry.hsk} size="sm" color="fg-dim" />
                  )
                }
              />

              <View className="flex-1" />

              {gloss == null ? null : (
                <Text
                  className="ml-4 flex-1 text-right font-sans text-base text-fg"
                  numberOfLines={2}
                >
                  {gloss}
                </Text>
              )}

              <Icon
                icon="chevron-right"
                size={12}
                className="ml-2"
                tintColorClassName="accent-fg-dim"
              />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
