import { getWikiCharacterData } from "@/client/wiki";
import { hanziSvgPathsQuery } from "@/client/query";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import {
  componentToString,
  idsNodeToString,
  isHanziCharacter,
  isLeafNode,
} from "@/data/hanzi";
import type {
  HanziCharacter,
  HanziText,
  IdsNode,
  WikiCharacterComponent,
  WikiCharacterDecomposition,
} from "@/data/model";
import { IdsOperator, wikiCharacterDecompositionSchema } from "@/data/model";
import { userWikiCharacterDecompositionSetting } from "@/data/userSettings";
import { decompositionComponentsToIds } from "@/dictionary";
import { parseIndexRanges, normalizeIndexRanges } from "@/util/indexRanges";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { use, useEffect, useState, Suspense } from "react";
import type { ReactNode } from "react";
import { Platform, Pressable, Text, View, Image } from "react-native";
import { G, Svg } from "react-native-svg";
import { DropdownMenu } from "./DropdownMenu";
import { hanziCharacterColorSchema } from "./HanziCharacter.utils";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";
import { useHanziVisualSuggestions } from "./hooks/useHanziVisualSuggestions";
import { PathCss } from "./svg";
import { useDb } from "./hooks/useDb";

interface DecompositionOption {
  ids: string;
  components: WikiCharacterDecomposition;
}

type UserWikiCharacterDecompositionValue = ReturnType<
  typeof userWikiCharacterDecompositionSetting.entity.unmarshalValueSafe
>;

const visualOperators = [
  IdsOperator.LeftToRight,
  IdsOperator.AboveToBelow,
  IdsOperator.LeftToMiddleToRight,
  IdsOperator.AboveToMiddleAndBelow,
  IdsOperator.FullSurround,
  IdsOperator.SurroundFromAbove,
  IdsOperator.SurroundFromBelow,
  IdsOperator.SurroundFromLeft,
] as const;

type VisualOperator = (typeof visualOperators)[number];

function isVisualOperator(value: string): value is VisualOperator {
  return visualOperators.includes(value as VisualOperator);
}

function arityForOperator(operator: VisualOperator): 2 | 3 {
  switch (operator) {
    case IdsOperator.LeftToRight:
    case IdsOperator.AboveToBelow:
    case IdsOperator.FullSurround:
    case IdsOperator.SurroundFromAbove:
    case IdsOperator.SurroundFromBelow:
    case IdsOperator.SurroundFromLeft: {
      return 2;
    }
    case IdsOperator.LeftToMiddleToRight:
    case IdsOperator.AboveToMiddleAndBelow: {
      return 3;
    }
  }
}

const overflowDragMime = `application/x-pinyinly-overflow-cell`;

const leafCellClassName = `flex-1 gap-2 p-3`;

// Full class strings must be literal so NativeWind includes them in the bundle.
const colorSwatchClass = {
  fg: `bg-fg`,
  blue: `bg-blue`,
  yellow: `bg-yellow`,
  amber: `bg-amber`,
  cyanold: `bg-cyanold`,
} as const;

const colorTextClass = {
  fg: `text-fg`,
  blue: `text-blue`,
  yellow: `text-yellow`,
  amber: `text-amber`,
  cyanold: `text-cyanold`,
} as const;

function getOverrideComponents(
  value: UserWikiCharacterDecompositionValue,
): WikiCharacterDecomposition | null {
  if (value == null) {
    return null;
  }

  const parsed = wikiCharacterDecompositionSchema.safeParse(value.components);
  if (parsed.success) {
    return parsed.data;
  }

  return null;
}

function cloneLeaf(leaf: WikiCharacterComponent): WikiCharacterComponent {
  return {
    ...leaf,
  };
}

function cloneDecomposition(
  node: WikiCharacterDecomposition,
): WikiCharacterDecomposition {
  if (isLeafNode(node)) {
    return cloneLeaf(node);
  }

  const [operator, ...children] = node;
  return [
    operator,
    ...children.map((child) =>
      cloneDecomposition(child as WikiCharacterDecomposition),
    ),
  ] as WikiCharacterDecomposition;
}

function collectLeafs(
  node: WikiCharacterDecomposition,
): WikiCharacterComponent[] {
  if (isLeafNode(node)) {
    return [cloneLeaf(node)];
  }

  const [, ...children] = node;
  return children.flatMap((child) =>
    collectLeafs(child as WikiCharacterDecomposition),
  );
}

function buildRootForOperator(
  operator: VisualOperator,
  source: WikiCharacterDecomposition,
): {
  nextNode: WikiCharacterDecomposition;
  overflowLeafs: WikiCharacterComponent[];
} {
  const leafs = collectLeafs(source);
  const nextLeafs: IdsNode<WikiCharacterComponent>[] = [];
  const keepCount = arityForOperator(operator);

  for (let i = 0; i < keepCount; i += 1) {
    const leaf = leafs[i] ?? { strokes: `` };
    nextLeafs.push(cloneLeaf(leaf));
  }

  return {
    nextNode: [operator, ...nextLeafs] as WikiCharacterDecomposition,
    overflowLeafs: leafs.slice(keepCount).map(cloneLeaf),
  };
}

function flattenNodeToLeaf(source: WikiCharacterDecomposition): {
  leaf: WikiCharacterComponent;
  overflowLeafs: WikiCharacterComponent[];
} {
  const leafs = collectLeafs(source);
  const [first, ...rest] = leafs;

  return {
    leaf: first == null ? { strokes: `` } : cloneLeaf(first),
    overflowLeafs: rest.map(cloneLeaf),
  };
}

function isLeafMeaningful(leaf: WikiCharacterComponent): boolean {
  return (
    (leaf.hanzi?.trim().length ?? 0) > 0 ||
    leaf.strokes.trim().length > 0 ||
    leaf.color != null ||
    leaf.label != null ||
    leaf.strokeDiff != null
  );
}

function getCommittedHanziFromInput(value: string): HanziCharacter | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  for (const character of Array.from(trimmed).reverse()) {
    if (isHanziCharacter(character as HanziText)) {
      return character as HanziCharacter;
    }
  }

  return undefined;
}

function validateStrokeRanges(ranges: string): string | null {
  if (ranges.trim().length === 0) {
    return null;
  }

  if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/u.test(ranges)) {
    return `Strokes must be comma-separated indexes/ranges, e.g. 0,1-3`;
  }

  for (const part of ranges.split(`,`)) {
    const [startText, endText] = part.split(`-`);
    const start = Number(startText);
    const end = endText == null ? start : Number(endText);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      return `Stroke ranges must be ascending, e.g. 1-3`;
    }
  }

  return null;
}

function firstValidationError(node: WikiCharacterDecomposition): string | null {
  if (isLeafNode(node)) {
    const hanzi = node.hanzi ?? ``;
    if (!isHanziCharacter(hanzi as HanziText)) {
      return `Each cell needs one valid Hanzi character.`;
    }

    return validateStrokeRanges(node.strokes);
  }

  const [operator, ...children] = node;
  if (!isVisualOperator(operator)) {
    return `Unsupported IDS operator in current decomposition: ${operator}`;
  }

  for (const child of children) {
    const error = firstValidationError(child as WikiCharacterDecomposition);
    if (error != null) {
      return error;
    }
  }

  return null;
}

function StrokePicker({
  strokePaths,
  selectedStrokes,
  onToggle,
}: {
  strokePaths: string[];
  selectedStrokes: Set<number>;
  onToggle: (i: number) => void;
}) {
  const [hoveredStrokeIndex, setHoveredStrokeIndex] = useState<number | null>(
    null,
  );

  return (
    <Svg viewBox="0 0 1024 1024" className="size-20 shrink-0">
      <G transform="scale(1, -1) translate(0, -900)">
        {strokePaths.map((d, i) => {
          const isSelected = selectedStrokes.has(i);
          const isHovered = hoveredStrokeIndex === i;

          return (
            <PathCss
              key={i}
              d={d}
              className={
                isSelected
                  ? `fill-fg-loud stroke-fg-loud`
                  : isHovered
                    ? `fill-fg-loud/60 stroke-fg-loud/60`
                    : `fill-fg-bg40 stroke-fg-bg40`
              }
              strokeWidth={isHovered ? 24 : 20}
              onHoverIn={() => {
                setHoveredStrokeIndex(i);
              }}
              onHoverOut={() => {
                setHoveredStrokeIndex((current) =>
                  current === i ? null : current,
                );
              }}
              onPress={() => {
                onToggle(i);
              }}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function HanziVisualSuggestionsPanel({
  strokePaths,
  selectedStrokeIndexes,
  onSelect,
}: {
  strokePaths: readonly string[] | null;
  selectedStrokeIndexes: readonly number[];
  onSelect: (hanzi: HanziCharacter) => void;
}) {
  const [isBitmapNudgingActive, setIsBitmapNudgingActive] = useState(false);
  const [bitmapOffsetX, setBitmapOffsetX] = useState(0);
  const [bitmapOffsetY, setBitmapOffsetY] = useState(0);

  const suggestionsState = useHanziVisualSuggestions({
    strokePaths,
    selectedStrokeIndexes,
    pixelOffsetX: bitmapOffsetX,
    pixelOffsetY: bitmapOffsetY,
    limit: 6,
    debounceMs: 320,
  });

  useEffect(() => {
    if (
      Platform.OS !== `web` ||
      !isBitmapNudgingActive ||
      typeof window === `undefined`
    ) {
      return;
    }

    const handleArrowNudge = (event: KeyboardEvent) => {
      if (event.key === `Escape`) {
        setIsBitmapNudgingActive(false);
        return;
      }

      switch (event.key) {
        case `ArrowLeft`:
          event.preventDefault();
          setBitmapOffsetX((value) => value - 1);
          return;
        case `ArrowRight`:
          event.preventDefault();
          setBitmapOffsetX((value) => value + 1);
          return;
        case `ArrowUp`:
          event.preventDefault();
          setBitmapOffsetY((value) => value - 1);
          return;
        case `ArrowDown`:
          event.preventDefault();
          setBitmapOffsetY((value) => value + 1);
          return;
        default:
          return;
      }
    };

    window.addEventListener(`keydown`, handleArrowNudge);
    return () => {
      window.removeEventListener(`keydown`, handleArrowNudge);
    };
  }, [isBitmapNudgingActive]);

  if (selectedStrokeIndexes.length === 0) {
    return null;
  }

  if (suggestionsState.kind === `idle`) {
    return null;
  }

  return (
    <View className="gap-2">
      {suggestionsState.kind === `loading` ? (
        <Text className="pyly-body-caption text-fg-dim">
          Finding matches...
        </Text>
      ) : null}

      {suggestionsState.kind === `unsupported` ? (
        <Text className="pyly-body-caption text-fg-dim">
          {suggestionsState.message}
        </Text>
      ) : null}

      {suggestionsState.kind === `error` ? (
        <Text className="pyly-body-caption text-warning">
          {suggestionsState.message}
        </Text>
      ) : null}

      {suggestionsState.kind === `success` ? (
        <View className="flex-row">
          <View className="gap-1">
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setIsBitmapNudgingActive(true);
              }}
              className={
                isBitmapNudgingActive
                  ? `self-start rounded border border-blue p-0.5`
                  : `self-start rounded border border-transparent p-0.5`
              }
            >
              <Image
                source={{ uri: suggestionsState.debugBitmapUrl }}
                style={{ width: 96, height: 96 }}
                resizeMode="stretch"
              />
            </Pressable>
          </View>
          {suggestionsState.suggestions.length === 0 ? (
            <Text className="pyly-body-caption text-fg-dim">
              No close matches yet.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {suggestionsState.suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.hanzi}
                  onPress={(event) => {
                    event.stopPropagation();
                    onSelect(suggestion.hanzi);
                  }}
                  className={`
                    rounded-md border border-fg/20 bg-bg-high px-2 py-1

                    hover:bg-fg/5
                  `}
                >
                  <Text className="font-sans text-xs text-fg">
                    {suggestion.hanzi}
                    {` `}
                    <Text className="text-fg-dim">
                      {Math.round(suggestion.score * 100)}%
                    </Text>
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function HanziDecompositionEditor({ hanzi }: { hanzi: HanziText }) {
  const characterData = use(getWikiCharacterData(hanzi));
  const { data: strokePathsData } = useQuery(
    hanziSvgPathsQuery(isHanziCharacter(hanzi) ? hanzi : null),
  );
  const strokePaths = strokePathsData ?? null;
  const db = useDb();
  const userWikiCharacterDecomposition = useUserSetting({
    setting: userWikiCharacterDecompositionSetting,
    key: { hanzi },
  });
  const overrideComponents = getOverrideComponents(
    userWikiCharacterDecomposition.value,
  );

  const mnemonicIds =
    characterData?.mnemonic == null
      ? null
      : idsNodeToString(characterData.mnemonic.components, componentToString);

  const builtInOptions: DecompositionOption[] = [];
  const seenBuiltInIds = new Set<string>();

  const pushBuiltInOption = (
    ids: string | null,
    components: WikiCharacterDecomposition,
  ) => {
    if (ids == null) {
      return;
    }

    if (seenBuiltInIds.has(ids)) {
      return;
    }

    seenBuiltInIds.add(ids);
    builtInOptions.push({ ids, components });
  };

  if (mnemonicIds != null && characterData?.mnemonic != null) {
    pushBuiltInOption(mnemonicIds, characterData.mnemonic.components);
  }

  for (const decomposition of characterData?.decompositions ?? []) {
    const ids = idsNodeToString(decomposition, componentToString);
    pushBuiltInOption(ids, decomposition);
  }

  const { data: selectedDecompositionRows } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.characterDecompositionCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .select(({ entry }) => ({
          decompositionComponents: entry.decompositionComponents,
        })),
    [db.characterDecompositionCollection, hanzi],
  );

  const selectedDecomposition = selectedDecompositionRows[0];
  const selectedComponents =
    overrideComponents ??
    selectedDecomposition?.decompositionComponents ??
    builtInOptions[0]?.components ??
    null;

  const [draftComponents, setDraftComponents] =
    useState<WikiCharacterDecomposition | null>(
      selectedComponents == null
        ? null
        : cloneDecomposition(selectedComponents),
    );
  const [draftOverflow, setDraftOverflow] = useState<WikiCharacterComponent[]>(
    [],
  );
  const [hanziInputByPath, setHanziInputByPath] = useState<
    Record<string, string>
  >({});
  const [dropTargetPathKey, setDropTargetPathKey] = useState<string | null>(
    null,
  );

  const draftIds =
    draftComponents == null
      ? null
      : decompositionComponentsToIds(draftComponents);
  const draftValidationError =
    draftComponents == null
      ? `No decomposition data available.`
      : firstValidationError(draftComponents);

  const updateDraftAtPath = (
    path: readonly number[],
    updateLeaf: (leaf: WikiCharacterComponent) => WikiCharacterComponent,
  ) => {
    const updateNode = (
      node: WikiCharacterDecomposition,
      remainingPath: readonly number[],
    ): WikiCharacterDecomposition => {
      if (remainingPath.length === 0) {
        if (isLeafNode(node)) {
          return updateLeaf(node);
        }
        return node;
      }

      if (isLeafNode(node)) {
        return node;
      }

      const [nextIndex, ...nextPath] = remainingPath;
      if (nextIndex == null || nextIndex <= 0 || nextIndex >= node.length) {
        return node;
      }

      const child = node[nextIndex] as WikiCharacterDecomposition;
      const updatedChild = updateNode(child, nextPath);
      const clone = [...node] as unknown[];
      clone[nextIndex] = updatedChild;
      return clone as WikiCharacterDecomposition;
    };

    setDraftComponents((current) => {
      if (current == null) {
        return current;
      }
      return updateNode(current, path);
    });
  };

  const replaceDraftNodeAtPath = (
    path: readonly number[],
    nextNode: WikiCharacterDecomposition,
  ) => {
    const replaceNode = (
      node: WikiCharacterDecomposition,
      remainingPath: readonly number[],
    ): WikiCharacterDecomposition => {
      if (remainingPath.length === 0) {
        return cloneDecomposition(nextNode);
      }

      if (isLeafNode(node)) {
        return node;
      }

      const [nextIndex, ...nextPath] = remainingPath;
      if (nextIndex == null || nextIndex <= 0 || nextIndex >= node.length) {
        return node;
      }

      const child = node[nextIndex] as WikiCharacterDecomposition;
      const updatedChild = replaceNode(child, nextPath);
      const clone = [...node] as unknown[];
      clone[nextIndex] = updatedChild;
      return clone as WikiCharacterDecomposition;
    };

    setDraftComponents((current) => {
      if (current == null) {
        return current;
      }

      return replaceNode(current, path);
    });
  };

  const selectDecomposition = (option: DecompositionOption) => {
    setDraftComponents(cloneDecomposition(option.components));
    setDraftOverflow([]);
    setHanziInputByPath({});
  };

  const saveVisualDecomposition = () => {
    if (draftComponents == null || draftValidationError != null) {
      return;
    }

    userWikiCharacterDecomposition.setValue({
      hanzi,
      components: draftComponents,
    });
  };

  const resetToDefault = () => {
    userWikiCharacterDecomposition.setValue(null);

    const defaultComponents = builtInOptions[0]?.components ?? null;
    setDraftComponents(
      defaultComponents == null ? null : cloneDecomposition(defaultComponents),
    );
    setDraftOverflow([]);
    setHanziInputByPath({});
  };

  const getNodeAtPath = (
    root: WikiCharacterDecomposition,
    path: readonly number[],
  ): WikiCharacterDecomposition | null => {
    let current: WikiCharacterDecomposition = root;

    for (const nextIndex of path) {
      if (isLeafNode(current)) {
        return null;
      }

      if (nextIndex <= 0 || nextIndex >= current.length) {
        return null;
      }

      const child = current[nextIndex];
      if (child == null) {
        return null;
      }

      current = child as WikiCharacterDecomposition;
    }

    return current;
  };

  const applyLayoutAtPath = (
    targetPath: readonly number[],
    nextLayout: `leaf` | VisualOperator,
  ) => {
    if (draftComponents == null) {
      return;
    }

    const targetNode = getNodeAtPath(draftComponents, targetPath);
    if (targetNode == null) {
      return;
    }

    if (nextLayout === `leaf`) {
      if (isLeafNode(targetNode)) {
        return;
      }

      const { leaf: nextLeaf, overflowLeafs } = flattenNodeToLeaf(targetNode);
      if (overflowLeafs.length > 0) {
        setDraftOverflow((current) => [...current, ...overflowLeafs]);
      }

      replaceDraftNodeAtPath(targetPath, nextLeaf);
      return;
    }

    const { nextNode, overflowLeafs } = buildRootForOperator(
      nextLayout,
      targetNode,
    );
    if (overflowLeafs.length > 0) {
      setDraftOverflow((current) => [...current, ...overflowLeafs]);
    }

    replaceDraftNodeAtPath(targetPath, nextNode);
  };

  const renderNode = (
    node: WikiCharacterDecomposition,
    path: readonly number[] = [],
    isRootLayout = false,
  ): ReactNode => {
    if (isLeafNode(node)) {
      const leaf = node;
      const currentColor = hanziCharacterColorSchema
        .catch(`fg`)
        .parse(leaf.color);
      const pathKey = path.join(`.`);
      const isDropTarget = dropTargetPathKey === pathKey;
      const hanziInputValue = hanziInputByPath[pathKey] ?? leaf.hanzi ?? ``;
      const selectedStrokeIndexes = parseIndexRanges(leaf.strokes);
      const layoutTargetPath = path;
      const layoutTargetNode =
        draftComponents == null
          ? null
          : getNodeAtPath(draftComponents, layoutTargetPath);
      const currentLayoutValue =
        layoutTargetNode == null || isLeafNode(layoutTargetNode)
          ? `leaf`
          : layoutTargetNode[0];

      const getLeafHanziSizeClass = (): string => {
        // Keep all possible classes as literals so NativeWind can include them.
        const sizeTiers = [
          `text-6xl`,
          `text-5xl`,
          `text-4xl`,
          `text-3xl`,
          `text-2xl`,
          `text-xl`,
        ] as const;

        if (path.length === 0) {
          return sizeTiers[0];
        }

        const parentPath = path.slice(0, -1);
        const parentNode =
          draftComponents == null
            ? null
            : getNodeAtPath(draftComponents, parentPath);

        let baseTier = 0;
        if (parentNode != null && !isLeafNode(parentNode)) {
          const parentOperator = parentNode[0];
          if (
            isVisualOperator(parentOperator) &&
            arityForOperator(parentOperator) === 3
          ) {
            baseTier = 1;
          }
        }

        const depthPenalty = Math.max(0, path.length - 1);
        const tier = Math.min(sizeTiers.length - 1, baseTier + depthPenalty);
        return sizeTiers[tier] ?? `text-xl`;
      };

      const leafHanziSizeClass = getLeafHanziSizeClass();

      const webDropTargetProps: Record<string, unknown> =
        Platform.OS === `web`
          ? {
              onDragOver: (event: { preventDefault: () => void }) => {
                event.preventDefault();
                setDropTargetPathKey(pathKey);
              },
              onDrop: (event: {
                preventDefault: () => void;
                dataTransfer?: {
                  getData: (mime: string) => string;
                };
              }) => {
                event.preventDefault();
                setDropTargetPathKey(null);

                const payloadText =
                  event.dataTransfer?.getData(overflowDragMime) ?? ``;
                if (payloadText.length === 0) {
                  return;
                }

                let payload: unknown;
                try {
                  payload = JSON.parse(payloadText);
                } catch {
                  return;
                }

                if (
                  payload == null ||
                  typeof payload !== `object` ||
                  !(`index` in payload) ||
                  !(`kind` in payload)
                ) {
                  return;
                }

                const index = (payload as { index: unknown }).index;
                const kind = (payload as { kind: unknown }).kind;
                if (kind !== `overflow-cell` || typeof index !== `number`) {
                  return;
                }

                const sourceLeaf = draftOverflow[index];
                if (sourceLeaf == null) {
                  return;
                }

                setDraftOverflow((current) =>
                  current.filter((_, currentIndex) => currentIndex !== index),
                );

                if (isLeafMeaningful(leaf)) {
                  setDraftOverflow((current) => [...current, cloneLeaf(leaf)]);
                }

                updateDraftAtPath(path, () => cloneLeaf(sourceLeaf));
              },
              onDragLeave: () => {
                setDropTargetPathKey((current) =>
                  current === pathKey ? null : current,
                );
              },
            }
          : {};

      const leafEditor = (
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Pressable
              className={`
                relative items-center justify-center transition-colors

                hover:bg-fg/5 hover:opacity-100

                ${isDropTarget ? `bg-blue/10` : ``}

                size-full

                ${leafCellClassName}
              `}
              {...(webDropTargetProps as object)}
            >
              {leaf.hanzi == null ? null : (
                <Text
                  className={`
                    ${leafHanziSizeClass}
                    ${colorTextClass[currentColor]}
                  `}
                >
                  {leaf.hanzi}
                </Text>
              )}
            </Pressable>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <TextInputSingle
              className="rounded-lg border border-fg/15 bg-bg-high px-2 py-1"
              autoFocus
              placeholder="字"
              value={hanziInputValue}
              onChangeText={(value) => {
                setHanziInputByPath((current) => ({
                  ...current,
                  [pathKey]: value,
                }));

                // Keep the cell preview in sync while typing. Some menu-close
                // paths don't reliably fire onEndEditing for nested cells.
                const committed = getCommittedHanziFromInput(value);
                updateDraftAtPath(path, (previous) => ({
                  ...previous,
                  hanzi: committed,
                }));
              }}
              onEndEditing={(event) => {
                const committed = getCommittedHanziFromInput(
                  event.nativeEvent.text,
                );
                updateDraftAtPath(path, (previous) => ({
                  ...previous,
                  hanzi: committed,
                }));
                setHanziInputByPath((current) => {
                  const next = { ...current };
                  next[pathKey] = committed ?? ``;
                  return next;
                });
              }}
            />
            {strokePaths == null ? null : (
              <>
                <DropdownMenu.Separator />
                <DropdownMenu.Label>Strokes</DropdownMenu.Label>
                <View className="mt-1 flex-row items-start gap-3">
                  <Suspense fallback={null}>
                    <StrokePicker
                      strokePaths={strokePaths}
                      selectedStrokes={new Set(selectedStrokeIndexes)}
                      onToggle={(i) => {
                        const current = new Set(selectedStrokeIndexes);
                        if (current.has(i)) {
                          current.delete(i);
                        } else {
                          current.add(i);
                        }
                        updateDraftAtPath(path, (previous) => ({
                          ...previous,
                          strokes: normalizeIndexRanges(
                            [...current].sort((a, b) => a - b).join(`,`),
                          ),
                        }));
                      }}
                    />
                  </Suspense>
                  <View className="min-w-0 flex-1">
                    <HanziVisualSuggestionsPanel
                      strokePaths={strokePaths}
                      selectedStrokeIndexes={selectedStrokeIndexes}
                      onSelect={(selectedHanzi) => {
                        updateDraftAtPath(path, (previous) => ({
                          ...previous,
                          hanzi: selectedHanzi,
                        }));
                        setHanziInputByPath((current) => ({
                          ...current,
                          [pathKey]: selectedHanzi,
                        }));
                      }}
                    />
                  </View>
                </View>
              </>
            )}
            <DropdownMenu.Separator />
            <DropdownMenu.Label>Color</DropdownMenu.Label>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {hanziCharacterColorSchema.options.map((color) => {
                const isSelected = color === currentColor;

                return (
                  <Pressable
                    key={color}
                    onPress={(event) => {
                      event.stopPropagation();
                      updateDraftAtPath(path, (previous) => ({
                        ...previous,
                        color: color === `fg` ? undefined : color,
                      }));
                    }}
                    className={
                      isSelected
                        ? `size-9 items-center justify-center rounded-md border border-blue bg-bg`
                        : `
                          size-9 items-center justify-center rounded-md border border-fg/20 bg-bg

                          hover:bg-fg/5
                        `
                    }
                  >
                    <View
                      className={colorSwatchClass[color]}
                      style={{ width: 18, height: 18, borderRadius: 9 }}
                    />
                  </Pressable>
                );
              })}
            </View>
            <DropdownMenu.Separator />
            <DropdownMenu.Label>Layout</DropdownMenu.Label>
            <View className="mt-1 flex-row flex-wrap gap-2">
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  applyLayoutAtPath(layoutTargetPath, `leaf`);
                }}
                className={
                  currentLayoutValue === `leaf`
                    ? `size-9 items-center justify-center rounded-md border border-blue bg-bg`
                    : `
                      size-9 items-center justify-center rounded-md border border-fg/20 bg-bg

                      hover:bg-fg/5
                    `
                }
              >
                <Text className="pyly-body-caption text-fg">{`□`}</Text>
              </Pressable>

              {visualOperators.map((op) => (
                <Pressable
                  key={op}
                  onPress={(event) => {
                    event.stopPropagation();
                    applyLayoutAtPath(layoutTargetPath, op);
                  }}
                  className={
                    currentLayoutValue === op
                      ? `size-9 items-center justify-center rounded-md border border-blue bg-bg`
                      : `
                        size-9 items-center justify-center rounded-md border border-fg/20 bg-bg

                        hover:bg-fg/5
                      `
                  }
                >
                  <Text className="pyly-body-caption text-fg">{op}</Text>
                </Pressable>
              ))}
            </View>
          </DropdownMenu.Content>
        </DropdownMenu>
      );

      if (!isRootLayout) {
        return leafEditor;
      }

      return (
        <View className="relative size-full">
          <View className="size-full rounded-xl border-2 border-solid border-fg-bg60">
            {leafEditor}
          </View>
          <View
            className={`absolute bottom-[-10px] left-1/2 z-20 -translate-x-1/2`}
          >
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Pressable
                  className={`
                    flex-row items-center gap-1 rounded bg-fg-bg80 px-1.5 py-0.5

                    hover:bg-fg-bg90
                  `}
                >
                  <Text className="pyly-body-caption text-on-fg">{`□`}</Text>
                  <Text className="pyly-body-caption text-on-fg">{`▾`}</Text>
                </Pressable>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <View className="flex-row flex-wrap gap-1 p-1">
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      applyLayoutAtPath(path, `leaf`);
                    }}
                    className="size-7 items-center justify-center rounded border border-blue bg-bg"
                  >
                    <Text className="pyly-body-caption text-fg">{`□`}</Text>
                  </Pressable>
                  {visualOperators.map((op) => (
                    <Pressable
                      key={op}
                      onPress={(event) => {
                        event.stopPropagation();
                        applyLayoutAtPath(path, op);
                      }}
                      className={`
                        size-7 items-center justify-center rounded border border-fg/20 bg-bg

                        hover:bg-fg/5
                      `}
                    >
                      <Text className="pyly-body-caption text-fg">{op}</Text>
                    </Pressable>
                  ))}
                </View>
              </DropdownMenu.Content>
            </DropdownMenu>
          </View>
        </View>
      );
    }

    const [operator, ...children] = node;
    if (!isVisualOperator(operator)) {
      return (
        <View
          className={`size-full gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3`}
        >
          <Text className="pyly-body-caption text-danger">
            Operator {operator} is not supported in the visual editor yet.
          </Text>
          <Text className="pyly-body-caption text-fg-dim">
            Reset to default or choose another built-in decomposition.
          </Text>
        </View>
      );
    }

    const childElements: ReactNode[] = [];
    for (const [index, child] of children.entries()) {
      const childIndex = index + 1;
      childElements.push(
        renderNode(child as WikiCharacterDecomposition, [...path, childIndex]),
      );
    }

    const renderParentLayoutToolbar = () => (
      <View
        className={`absolute bottom-[-10px] left-1/2 z-20 -translate-x-1/2`}
      >
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Pressable
              className={`
                flex-row items-center gap-1 rounded bg-fg-bg80 px-1.5 py-0.5

                hover:bg-fg-bg90
              `}
            >
              <Text className="pyly-body-caption text-on-fg">{operator}</Text>
              <Text className="pyly-body-caption text-on-fg">{`▾`}</Text>
            </Pressable>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <View className="flex-row flex-wrap gap-1 p-1">
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  applyLayoutAtPath(path, `leaf`);
                }}
                className={`
                  size-7 items-center justify-center rounded border border-fg/20 bg-bg

                  hover:bg-fg/5
                `}
              >
                <Text className="pyly-body-caption text-fg">{`□`}</Text>
              </Pressable>
              {visualOperators.map((op) => (
                <Pressable
                  key={op}
                  onPress={(event) => {
                    event.stopPropagation();
                    applyLayoutAtPath(path, op);
                  }}
                  className={
                    operator === op
                      ? `size-7 items-center justify-center rounded border border-blue bg-bg`
                      : `
                        size-7 items-center justify-center rounded border border-fg/20 bg-bg

                        hover:bg-fg/5
                      `
                  }
                >
                  <Text className="pyly-body-caption text-fg">{op}</Text>
                </Pressable>
              ))}
            </View>
          </DropdownMenu.Content>
        </DropdownMenu>
      </View>
    );

    const withParentLayoutToolbar = (content: ReactNode): ReactNode => (
      <View
        className={isRootLayout ? `relative size-full` : `relative m-2 grow`}
      >
        {content}
        {renderParentLayoutToolbar()}
      </View>
    );

    const outerLayoutBorderClass = isRootLayout
      ? `border-2 border-solid border-fg-bg60`
      : `border border-dashed border-fg-bg40`;

    if (operator === IdsOperator.LeftToRight) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full flex-row rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View className="flex-1 border-r border-dashed border-fg-bg40">
            {childElements[0]}
          </View>
          <View className="flex-1">{childElements[1]}</View>
        </View>,
      );
    }

    if (operator === IdsOperator.AboveToBelow) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View className="flex-1 border-b border-dashed border-fg-bg40">
            {childElements[0]}
          </View>
          <View className="flex-1">{childElements[1]}</View>
        </View>,
      );
    }

    if (operator === IdsOperator.LeftToMiddleToRight) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full flex-row rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View className="flex-1 border-r border-dashed border-fg-bg40">
            {childElements[0]}
          </View>
          <View className="flex-1 border-r border-dashed border-fg-bg40">
            {childElements[1]}
          </View>
          <View className="flex-1">{childElements[2]}</View>
        </View>,
      );
    }

    if (operator === IdsOperator.AboveToMiddleAndBelow) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View className="flex-1 border-b border-dashed border-fg-bg40">
            {childElements[0]}
          </View>
          <View className="flex-1 border-b border-dashed border-fg-bg40">
            {childElements[1]}
          </View>
          <View className="flex-1">{childElements[2]}</View>
        </View>,
      );
    }

    if (operator === IdsOperator.FullSurround) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View>
            <View className="border-b border-dashed border-fg-bg40 p-1">
              {childElements[0]}
            </View>
            <View className="mx-8 p-1">{childElements[1]}</View>
          </View>
        </View>,
      );
    }

    if (operator === IdsOperator.SurroundFromAbove) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View>
            <View className="border-b border-dashed border-fg-bg40 p-1">
              {childElements[0]}
            </View>
            <View className="mx-6 p-1">{childElements[1]}</View>
          </View>
        </View>,
      );
    }

    if (operator === IdsOperator.SurroundFromBelow) {
      return withParentLayoutToolbar(
        <View
          className={`
            size-full rounded-xl

            ${outerLayoutBorderClass}
          `}
        >
          <View>
            <View className="mx-6 border-b border-dashed border-fg-bg40 p-1">
              {childElements[1]}
            </View>
            <View className="p-1">{childElements[0]}</View>
          </View>
        </View>,
      );
    }

    return withParentLayoutToolbar(
      <View
        className={`
          size-full rounded-xl

          ${outerLayoutBorderClass}
        `}
      >
        <View className="flex-row">
          <View className="min-w-16 flex-1 border-r border-dashed border-fg-bg40 p-1">
            {childElements[0]}
          </View>
          <View className="flex-[2] p-1">{childElements[1]}</View>
        </View>
      </View>,
    );
  };

  return (
    <View className="gap-3 rounded-xl border border-fg/10 bg-bg-high p-3">
      <View className="flex-row flex-wrap gap-2">
        {builtInOptions.map((option, index) => {
          const isSelected = option.ids === draftIds;
          return (
            <RectButton
              key={option.ids}
              variant={isSelected ? `option` : `outline`}
              onPress={() => {
                selectDecomposition(option);
              }}
            >
              {index === 0 ? `Default` : `Option ${index + 1}`}: {option.ids}
            </RectButton>
          );
        })}
      </View>

      {draftComponents == null ? (
        <Text className="pyly-body-caption text-fg-dim">
          No decomposition available for this character.
        </Text>
      ) : (
        <View className="mb-2 self-start" style={{ width: 250, height: 250 }}>
          {renderNode(draftComponents, [], true)}
        </View>
      )}

      {draftOverflow.length === 0 ? null : (
        <View className={`gap-2 rounded-xl border border-fg/10 p-3`}>
          <View className="flex-row flex-wrap gap-2">
            {draftOverflow.map((overflowLeaf, index) => {
              const currentColor = hanziCharacterColorSchema
                .catch(`fg`)
                .parse(overflowLeaf.color);
              const webDragProps: Record<string, unknown> =
                Platform.OS === `web`
                  ? {
                      draggable: true,
                      onDragStart: (event: {
                        dataTransfer?: {
                          setData: (mime: string, value: string) => void;
                          effectAllowed?: string;
                        };
                      }) => {
                        event.dataTransfer?.setData(
                          overflowDragMime,
                          JSON.stringify({ kind: `overflow-cell`, index }),
                        );
                        if (event.dataTransfer != null) {
                          event.dataTransfer.effectAllowed = `move`;
                        }
                      },
                      onDragEnd: () => {
                        setDropTargetPathKey(null);
                      },
                    }
                  : {};

              return (
                <Pressable
                  key={`${overflowLeaf.hanzi ?? `empty`}-${index}`}
                  className={`
                    min-w-12 items-center rounded-md border border-fg/20 bg-bg-high px-2 py-1
                  `}
                  {...(webDragProps as object)}
                >
                  <Text
                    className={`
                      text-xl

                      ${colorTextClass[currentColor]}
                    `}
                  >
                    {overflowLeaf.hanzi ?? ``}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {draftValidationError == null ? null : (
        <Text className="pyly-body-caption text-danger">
          {draftValidationError}
        </Text>
      )}

      <View className="flex-row flex-wrap gap-2">
        <RectButton
          variant="option"
          disabled={draftValidationError != null || draftComponents == null}
          onPress={saveVisualDecomposition}
        >
          Save decomposition
        </RectButton>
        <RectButton variant="bareDim" onPress={resetToDefault}>
          Reset to default
        </RectButton>
      </View>
    </View>
  );
}
