import { characterDecompositionQuery } from "@/client/query";
import { isHanziCharacter, isLeafNode, walkIdsNodeLeafs } from "@/data/hanzi";
import type {
  HanziCharacter,
  HanziText,
  IdsNode,
  WikiCharacterComponent,
} from "@/data/model";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import {
  normalizeStrokeSpec,
  projectStrokeSpecThroughBindings,
} from "@/util/strokeSpec";
import { useState } from "react";
import { View } from "react-native";
import { HanziStrokesTile } from "./HanziStrokesTile";
import { isRedundantSelfDecomposition } from "./WikiHanziCharacterDecompositionComponents.utils";
import { WikiTitledBox } from "./WikiTitledBox";
import { useDb } from "./hooks/useDb";

interface DecompositionTreeItem {
  kind: `decomposition` | `mnemonic`;
  node: IdsNode<WikiCharacterComponent>;
}

const maxAutoDecompositionDepth = 6;
const decompositionGridMinColumnWidth = 148;
const decompositionGridColumnGap = 12;
const decompositionGridRowGap = 16;
const decompositionGridCellMinHeight = 124;

function mapStrokeSpecsToOriginalHanzi({
  localStrokeSpec,
  sourceStrokeSpecsInOriginal,
}: {
  localStrokeSpec: string;
  sourceStrokeSpecsInOriginal: readonly string[] | null;
}): string[] {
  return projectStrokeSpecThroughBindings({
    localStrokeSpec,
    sourceSlotBindingsInOriginal: sourceStrokeSpecsInOriginal,
  });
}

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

  const { data: decompositionData } = useQuery(
    characterDecompositionQuery(hanzi),
  );

  const decompositionTreeItems: DecompositionTreeItem[] = [];

  for (const decomposition of decompositionData?.decompositions ?? []) {
    decompositionTreeItems.push({
      kind: `decomposition`,
      node: decomposition,
    });
  }

  const mnemonicComponents = decompositionData?.mnemonic?.components;
  if (mnemonicComponents != null) {
    decompositionTreeItems.push({
      kind: `mnemonic`,
      node: mnemonicComponents,
    });
  }

  const leafHanziList: HanziText[] = [];
  for (const treeItem of decompositionTreeItems) {
    for (const leaf of walkIdsNodeLeafs(treeItem.node)) {
      const componentHanzi = leaf.hanzi;
      if (componentHanzi == null || componentHanzi.trim().length === 0) {
        continue;
      }
      if (!isHanziCharacter(componentHanzi)) {
        continue;
      }
      leafHanziList.push(componentHanzi);
    }
  }

  const dedupedHanziListKey = [...new Set(leafHanziList)].join(`|`);

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

  if (decompositionTreeItems.length === 0) {
    return null;
  }

  const primaryGlossByHanzi = new Map<string, string>();
  const rootHighlightStrokeRangesByHanzi = new Map<string, string>();

  for (const entry of dictionarySearchEntries ?? []) {
    if (primaryGlossByHanzi.has(entry.hanzi)) {
      continue;
    }

    const primaryGloss = entry.gloss[0] ?? ``;
    primaryGlossByHanzi.set(entry.hanzi, primaryGloss);
  }

  for (const treeItem of decompositionTreeItems) {
    for (const leaf of walkIdsNodeLeafs(treeItem.node)) {
      if (leaf.hanzi == null || leaf.strokes.trim().length === 0) {
        continue;
      }

      if (!isHanziCharacter(leaf.hanzi)) {
        continue;
      }

      const existingRanges =
        rootHighlightStrokeRangesByHanzi.get(leaf.hanzi) ?? ``;
      const mergedRanges =
        existingRanges.length === 0
          ? leaf.strokes
          : `${existingRanges},${leaf.strokes}`;
      rootHighlightStrokeRangesByHanzi.set(
        leaf.hanzi,
        normalizeStrokeSpec(mergedRanges),
      );
    }
  }

  const sortedTreeItems = [...decompositionTreeItems].sort((a, b) => {
    const aStrokeCount = [...walkIdsNodeLeafs(a.node)].reduce(
      (sum, leaf) => sum + leaf.strokes.length,
      0,
    );
    const bStrokeCount = [...walkIdsNodeLeafs(b.node)].reduce(
      (sum, leaf) => sum + leaf.strokes.length,
      0,
    );

    if (aStrokeCount !== bStrokeCount) {
      return bStrokeCount - aStrokeCount;
    }

    return a.kind.localeCompare(b.kind);
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
          {sortedTreeItems.map((treeItem, index) => (
            <DecompositionTileNode
              depth={0}
              gridCellWidth={gridCellWidth}
              glossByHanzi={primaryGlossByHanzi}
              key={`decomposition-root:${treeItem.kind}:${index}`}
              node={treeItem.node}
              originalHanzi={hanzi}
              rootHighlightStrokeRangesByHanzi={
                rootHighlightStrokeRangesByHanzi
              }
              sourceStrokeSpecsInOriginal={null}
              visitedHanzi={new Set([hanzi])}
            />
          ))}
        </View>
      </View>
    </WikiTitledBox>
  );
}

function DecompositionTileNode({
  node,
  originalHanzi,
  glossByHanzi,
  rootHighlightStrokeRangesByHanzi,
  sourceStrokeSpecsInOriginal,
  gridCellWidth,
  depth,
  visitedHanzi,
}: {
  node: IdsNode<WikiCharacterComponent>;
  originalHanzi: HanziCharacter;
  glossByHanzi: ReadonlyMap<string, string>;
  rootHighlightStrokeRangesByHanzi: ReadonlyMap<string, string>;
  sourceStrokeSpecsInOriginal: readonly string[] | null;
  gridCellWidth: number;
  depth: number;
  visitedHanzi: ReadonlySet<HanziCharacter>;
}) {
  if (isLeafNode(node)) {
    return (
      <DecompositionTileLeaf
        depth={depth}
        gridCellWidth={gridCellWidth}
        glossByHanzi={glossByHanzi}
        leaf={node}
        originalHanzi={originalHanzi}
        rootHighlightStrokeRangesByHanzi={rootHighlightStrokeRangesByHanzi}
        sourceStrokeSpecsInOriginal={sourceStrokeSpecsInOriginal}
        visitedHanzi={visitedHanzi}
      />
    );
  }

  const [, ...children] = node;
  const sortedChildren = [...children].sort((a, b) => {
    const aStrokeCount = isLeafNode(a)
      ? a.strokes.length
      : [...walkIdsNodeLeafs(a)].reduce(
          (sum, leaf) => sum + leaf.strokes.length,
          0,
        );
    const bStrokeCount = isLeafNode(b)
      ? b.strokes.length
      : [...walkIdsNodeLeafs(b)].reduce(
          (sum, leaf) => sum + leaf.strokes.length,
          0,
        );

    if (aStrokeCount !== bStrokeCount) {
      return bStrokeCount - aStrokeCount;
    }

    const aSortText = isLeafNode(a) ? (a.hanzi ?? a.label ?? ``) : ``;
    const bSortText = isLeafNode(b) ? (b.hanzi ?? b.label ?? ``) : ``;
    return aSortText.localeCompare(bSortText);
  });

  return (
    <>
      {sortedChildren.map((child, childIndex) => (
        <DecompositionTileNode
          depth={depth + 1}
          gridCellWidth={gridCellWidth}
          glossByHanzi={glossByHanzi}
          key={`decomposition-child:${depth}:${childIndex}`}
          node={child}
          originalHanzi={originalHanzi}
          rootHighlightStrokeRangesByHanzi={rootHighlightStrokeRangesByHanzi}
          sourceStrokeSpecsInOriginal={sourceStrokeSpecsInOriginal}
          visitedHanzi={visitedHanzi}
        />
      ))}
    </>
  );
}

function DecompositionTileLeaf({
  leaf,
  originalHanzi,
  glossByHanzi,
  rootHighlightStrokeRangesByHanzi,
  sourceStrokeSpecsInOriginal,
  gridCellWidth,
  depth,
  visitedHanzi,
}: {
  leaf: WikiCharacterComponent;
  originalHanzi: HanziCharacter;
  glossByHanzi: ReadonlyMap<string, string>;
  rootHighlightStrokeRangesByHanzi: ReadonlyMap<string, string>;
  sourceStrokeSpecsInOriginal: readonly string[] | null;
  gridCellWidth: number;
  depth: number;
  visitedHanzi: ReadonlySet<HanziCharacter>;
}) {
  const componentHanzi =
    leaf.hanzi != null && isHanziCharacter(leaf.hanzi) ? leaf.hanzi : null;

  const canAutoDecompose =
    componentHanzi != null &&
    depth < maxAutoDecompositionDepth &&
    !visitedHanzi.has(componentHanzi);

  const { data: childDecompositionData } = useQuery(
    characterDecompositionQuery(canAutoDecompose ? componentHanzi : null),
  );

  const db = useDb();
  const { data: componentDictionaryEntries } = useLiveQuery(
    (q) => {
      if (componentHanzi == null) {
        return null;
      }

      return q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, componentHanzi))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({ gloss: entry.gloss }));
    },
    [db.dictionarySearch, componentHanzi],
  );

  if (componentHanzi == null) {
    return null;
  }

  const fallbackGloss = componentDictionaryEntries?.[0]?.gloss[0] ?? null;
  const label = leaf.label ?? glossByHanzi.get(componentHanzi) ?? fallbackGloss;

  const localHighlightStrokeSpecsInOriginal = mapStrokeSpecsToOriginalHanzi({
    localStrokeSpec: leaf.strokes,
    sourceStrokeSpecsInOriginal,
  });
  const localHighlightStrokeRanges = normalizeStrokeSpec(
    localHighlightStrokeSpecsInOriginal.join(`,`),
  );
  const rootAggregateHighlightStrokeRanges =
    rootHighlightStrokeRangesByHanzi.get(componentHanzi) ?? null;
  const highlightStrokeRanges =
    depth === 0 && rootAggregateHighlightStrokeRanges != null
      ? rootAggregateHighlightStrokeRanges
      : localHighlightStrokeRanges;

  const childNode =
    childDecompositionData?.decompositions?.[0] ??
    childDecompositionData?.mnemonic?.components ??
    null;
  const nextChildNode = isRedundantSelfDecomposition({
    componentHanzi,
    childNode,
  })
    ? null
    : childNode;

  const nextVisitedHanzi = new Set(visitedHanzi);
  nextVisitedHanzi.add(componentHanzi);

  return (
    <>
      <View
        className="items-center justify-center"
        style={{
          minHeight: decompositionGridCellMinHeight,
          width: gridCellWidth,
        }}
      >
        <HanziStrokesTile
          componentHanzi={componentHanzi}
          fillWidth
          hanzi={highlightStrokeRanges.trim().length > 0 ? originalHanzi : null}
          highlightStrokeRanges={highlightStrokeRanges}
          label={label}
          labelNumberOfLines={1}
        />
      </View>

      {nextChildNode == null ? null : (
        <DecompositionTileNode
          depth={depth + 1}
          gridCellWidth={gridCellWidth}
          glossByHanzi={glossByHanzi}
          node={nextChildNode}
          originalHanzi={originalHanzi}
          rootHighlightStrokeRangesByHanzi={rootHighlightStrokeRangesByHanzi}
          sourceStrokeSpecsInOriginal={localHighlightStrokeSpecsInOriginal}
          visitedHanzi={nextVisitedHanzi}
        />
      )}
    </>
  );
}
