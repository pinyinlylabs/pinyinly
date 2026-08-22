import type { HanziCharacter, HanziText } from "@/data/model";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { use, useState } from "react";
import { View } from "@/client/ui/View";
import { HanziStrokesTile } from "./HanziStrokesTile";
import { WikiTitledBox } from "./WikiTitledBox";
import { useDb } from "./hooks/useDb";
import {
  deepDecomposeHanziWithStrokeSpecs,
  loadBuiltinCharacterDecompositionEntries,
} from "@/dictionary";
import { parseStrokeSpec } from "@/util/strokeSpec";

const decompositionGridMinColumnWidth = 130;
const decompositionGridColumnGap = 4;
const decompositionGridRowGap = 16;
const decompositionGridCellMinHeight = 124;

export function WikiHanziCharacterDecompositionComponents({
  hanzi,
}: {
  hanzi: HanziCharacter;
}) {
  const [decompositionGridWidth, setDecompositionGridWidth] =
    useState<number>(0);
  const db = useDb();

  const characterDecompositionEntries = use(
    loadBuiltinCharacterDecompositionEntries(),
  );

  const decompositionItems = deepDecomposeHanziWithStrokeSpecs(
    hanzi,
    characterDecompositionEntries,
  );

  const dedupedHanziListKey = [
    ...new Set(decompositionItems.map((x) => x.hanzi)),
  ].join(`|`);

  const { data: dictionaryEntries } = useLiveQuery(
    (q) => {
      if (dedupedHanziListKey.length === 0) {
        return null;
      }

      const dedupedHanziList = dedupedHanziListKey
        .split(`|`)
        .filter((item): item is HanziText => item.length > 0);

      return q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => inArray(entry.hanzi, dedupedHanziList))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanzi: entry.hanzi,
          gloss: entry.gloss,
        }));
    },
    [db.dictionaryCollection, dedupedHanziListKey],
  );

  if (decompositionItems.length === 0) {
    return null;
  }

  const primaryGlossByHanzi = new Map<string, string>();
  for (const entry of dictionaryEntries ?? []) {
    if (primaryGlossByHanzi.has(entry.hanzi)) {
      continue;
    }

    const primaryGloss = entry.gloss[0] ?? ``;
    primaryGlossByHanzi.set(entry.hanzi, primaryGloss);
  }

  const sortedDecompositionComponents = [...decompositionItems].sort((a, b) => {
    const aStrokeCount = parseStrokeSpec(a.strokeSpec).length;
    const bStrokeCount = parseStrokeSpec(b.strokeSpec).length;

    return bStrokeCount - aStrokeCount;
  });

  const resolvedGridWidth = Math.max(decompositionGridWidth, 1);
  const gridColumnCount = Math.max(
    1,
    Math.floor(
      (resolvedGridWidth + decompositionGridColumnGap) /
        (decompositionGridMinColumnWidth + decompositionGridColumnGap),
    ),
  );
  const gridCellWidth =
    (resolvedGridWidth - decompositionGridColumnGap * (gridColumnCount - 1)) /
    gridColumnCount;

  return (
    <WikiTitledBox title="Character components">
      <View className="gap-2 p-2 px-4">
        <View
          className="flex-row flex-wrap"
          onLayout={(event) => {
            const nextWidth = Math.floor(event.nativeEvent.layout.width);
            setDecompositionGridWidth((prev) =>
              prev === nextWidth ? prev : nextWidth,
            );
          }}
          style={{
            columnGap: decompositionGridColumnGap,
            rowGap: decompositionGridRowGap,
          }}
        >
          {sortedDecompositionComponents.map((treeItem, index) => (
            <View
              key={index}
              className="items-center justify-center"
              style={{
                minHeight: decompositionGridCellMinHeight,
                width: gridCellWidth,
              }}
            >
              <HanziStrokesTile
                componentHanzi={treeItem.hanzi}
                fillWidth
                hanzi={hanzi}
                componentStrokeSpec={treeItem.strokeSpec}
                label={primaryGlossByHanzi.get(treeItem.hanzi) ?? null}
                labelNumberOfLines={1}
              />
            </View>
          ))}
        </View>
      </View>
    </WikiTitledBox>
  );
}
