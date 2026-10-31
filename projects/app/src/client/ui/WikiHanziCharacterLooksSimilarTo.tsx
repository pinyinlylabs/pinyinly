import { wikiPayloadQuery } from "@/client/query";
import type { HanziCharacter } from "@/data/model";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { View } from "@/client/ui/View";
import { CompactWordRows } from "./CompactWordRows";
import type { CompactWordRowsEntry } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

export function WikiHanziCharacterLooksSimilarTo({
  hanzi,
}: {
  hanzi: HanziCharacter;
}) {
  const db = useDb();
  const { data: wikiPayload } = useQuery(wikiPayloadQuery(hanzi));
  const visuallySimilar = wikiPayload?.visuallySimilar ?? [];

  const { data: dictionaryEntries } = useLiveQuery({
    query: (q) =>
      visuallySimilar.length === 0
        ? null
        : q
            .from({ entry: db.dictionaryCollection })
            .where(({ entry }) => inArray(entry.hanzi, visuallySimilar))
            .orderBy(({ entry }) => entry.hskSortKey, `asc`)
            .orderBy(({ entry }) => entry.hanziWord, `asc`),
  });

  if (visuallySimilar.length === 0) {
    return null;
  }

  const entries: CompactWordRowsEntry[] = visuallySimilar.map((character) => {
    const entry = dictionaryEntries?.find((item) => item.hanzi === character);
    return {
      hanzi: character,
      hanziWord: entry?.hanziWord,
      hsk: entry?.hsk,
      hskFirstAppearance: entry?.hskFirstAppearance,
      gloss: entry?.gloss,
      pinyin: entry?.pinyin,
    };
  });

  return (
    <WikiTitledBox title="Looks similar to">
      <View className="p-3">
        <CompactWordRows dictionaryEntries={entries} />
      </View>
    </WikiTitledBox>
  );
}
