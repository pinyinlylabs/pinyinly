import { isHanziCharacter, parseIds, walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziCharacter, HanziText, StrokeSpecString } from "@/data/model";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { use, useState } from "react";
import { View } from "react-native";
import { HanziStrokesTile } from "./HanziStrokesTile";
import { WikiTitledBox } from "./WikiTitledBox";
import { useDb } from "./hooks/useDb";
import { loadBuiltinCharacterDecompositionEntries } from "@/dictionary";
import { mapStrokeSpec, parseStrokeSpec } from "@/util/strokeSpec";
import { nonNullable } from "@pinyinly/lib/invariant";

const decompositionGridMinColumnWidth = 148;
const decompositionGridColumnGap = 12;
const decompositionGridRowGap = 16;
const decompositionGridCellMinHeight = 124;

export function WikiHanziCharacterDecompositionComponents({
  hanzi,
}: {
  hanzi: HanziText;
}) {
  if (!isHanziCharacter(hanzi)) {
    return null;
  }

  return <WikiHanziCharacterDecompositionComponentsBox hanzi={hanzi} />;
}

function WikiHanziCharacterDecompositionComponentsBox({
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

  const decompositionItems: {
    hanzi: HanziCharacter;
    strokeSpec: StrokeSpecString;
  }[] = [];
  const decompositionQueue: {
    contextStrokeSpec: StrokeSpecString | null;
    hanzi: HanziCharacter;
  }[] = [{ contextStrokeSpec: null, hanzi }];
  while (decompositionQueue.length > 0) {
    const currentItem = nonNullable(decompositionQueue.shift());
    const entry = characterDecompositionEntries.find(
      (entry) => entry.hanzi === currentItem.hanzi,
    );

    if (!entry) {
      continue;
    }

    let i = -1;
    for (const leaf of walkIdsNodeLeafs(parseIds(entry.ids))) {
      i++;

      const strokeSpec = nonNullable(entry.strokeSpecs[i]);
      const mappedStrokeSpec =
        currentItem.contextStrokeSpec == null
          ? strokeSpec
          : mapStrokeSpec(currentItem.contextStrokeSpec, strokeSpec);
      if (mappedStrokeSpec != null) {
        decompositionItems.push({
          hanzi: leaf as HanziCharacter,
          strokeSpec: mappedStrokeSpec,
        });
      }
    }
  }

  // const decompositionItems: {
  //   hanzi: HanziCharacter;
  //   strokes: StrokeSpecString;
  // }[] = characterDecompositionEntries
  //   .filter((entry) => entry.hanzi === hanzi)
  //   .flatMap((entry) => {
  //     const result = [];

  //     return Object.values(entry.decompositions2).flatMap(([ids, strokeSpecs]) => {
  //           invariant(ids != null, `ids must not be null`);
  //           invariant(strokeSpecs != null, `strokeSpecs must not be null`);

  //           const result = [];

  //           let i = 0;
  //           for (const x of walkIdsNodeLeafs(parseIds(ids))) {
  //             if (!isHanziCharacter(x as HanziText)) {
  //               continue;
  //             }

  //             result.push({
  //               hanzi: x as HanziCharacter,
  //               strokes: nonNullable(strokeSpecs[i]) as StrokeSpecString,
  //             });
  //             i++;
  //           }
  //           return result;
  //         });
  //   });

  // decompositionData?.decompositions2 == null
  //   ? []
  //   : Object.values(decompositionData.decompositions2).flatMap(
  //       ([ids, strokeSpecs]) => {
  //         invariant(ids != null, `ids must not be null`);
  //         invariant(strokeSpecs != null, `strokeSpecs must not be null`);

  //         const result = [];

  //         let i = 0;
  //         for (const x of walkIdsNodeLeafs(parseIds(ids))) {
  //           if (!isHanziCharacter(x as HanziText)) {
  //             continue;
  //           }

  //           result.push({
  //             hanzi: x as HanziCharacter,
  //             strokes: nonNullable(strokeSpecs[i]) as StrokeSpecString,
  //           });
  //           i++;
  //         }
  //         return result;
  //       },
  //     );

  const dedupedHanziListKey = [
    ...new Set(decompositionItems.map((x) => x.hanzi)),
  ].join(`|`);

  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) => {
      if (dedupedHanziListKey.length === 0) {
        return null;
      }

      const dedupedHanziList = dedupedHanziListKey
        .split(`|`)
        .filter((item): item is HanziText => item.length > 0);

      return q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => inArray(entry.hanzi, dedupedHanziList))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanzi: entry.hanzi,
          gloss: entry.gloss,
        }));
    },
    [db.dictionarySearch, dedupedHanziListKey],
  );

  if (decompositionItems.length === 0) {
    return null;
  }

  const primaryGlossByHanzi = new Map<string, string>();
  for (const entry of dictionarySearchEntries ?? []) {
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
