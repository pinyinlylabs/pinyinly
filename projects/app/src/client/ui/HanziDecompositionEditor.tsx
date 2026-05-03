import { getWikiCharacterData } from "@/client/wiki";
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
import { use, useState, Suspense } from "react";
import type { ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { G, Svg } from "react-native-svg";
import { DropdownMenu } from "./DropdownMenu";
import type { HanziCharacterColor } from "./HanziCharacter.utils";
import { hanziCharacterColorSchema } from "./HanziCharacter.utils";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";
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

const overflowDragMime = `application/x-pinyinly-overflow-cell`;

const leafCellClassName = `min-h-28 min-w-24 flex-1 gap-2 bg-bg p-3`;

// Full class strings must be literal so NativeWind includes them in the bundle.
const colorSwatchClass: Record<HanziCharacterColor, string> = {
  fg: `bg-fg`,
  blue: `bg-blue`,
  yellow: `bg-yellow`,
  amber: `bg-amber`,
  cyanold: `bg-cyanold`,
};

const colorTextClass: Record<HanziCharacterColor, string> = {
  fg: `text-fg`,
  blue: `text-blue`,
  yellow: `text-yellow`,
  amber: `text-amber`,
  cyanold: `text-cyanold`,
};

const visualOperatorLabels: Record<VisualOperator, string> = {
  [IdsOperator.LeftToRight]: `Left / Right`,
  [IdsOperator.AboveToBelow]: `Top / Bottom`,
  [IdsOperator.LeftToMiddleToRight]: `Left / Mid / Right`,
  [IdsOperator.AboveToMiddleAndBelow]: `Top / Mid / Bottom`,
  [IdsOperator.FullSurround]: `Full Surround`,
  [IdsOperator.SurroundFromAbove]: `Surround from Top`,
  [IdsOperator.SurroundFromBelow]: `Surround from Bottom`,
  [IdsOperator.SurroundFromLeft]: `Surround from Left`,
};

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

function nestableChildIndices(operator: VisualOperator): readonly number[] {
  switch (operator) {
    case IdsOperator.LeftToRight:
    case IdsOperator.AboveToBelow: {
      return [1, 2];
    }
    case IdsOperator.LeftToMiddleToRight:
    case IdsOperator.AboveToMiddleAndBelow: {
      return [1, 2, 3];
    }
    case IdsOperator.FullSurround:
    case IdsOperator.SurroundFromAbove:
    case IdsOperator.SurroundFromBelow:
    case IdsOperator.SurroundFromLeft: {
      return [2];
    }
  }
}

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

  if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(ranges)) {
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
    <Svg viewBox="0 0 1024 1024" className="size-40 shrink-0">
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

export function HanziDecompositionEditor({ hanzi }: { hanzi: HanziText }) {
  const characterData = use(getWikiCharacterData(hanzi));
  const strokePaths = Array.isArray(characterData?.strokes)
    ? characterData.strokes
    : null;
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

  const renderNode = (
    node: WikiCharacterDecomposition,
    path: readonly number[] = [],
    isNestable = false,
  ): ReactNode => {
    if (isLeafNode(node)) {
      const leaf = node;
      const currentColor = hanziCharacterColorSchema
        .catch(`fg`)
        .parse(leaf.color);
      const pathKey = path.join(`.`);
      const isDropTarget = dropTargetPathKey === pathKey;
      const hanziInputValue = hanziInputByPath[pathKey] ?? leaf.hanzi ?? ``;

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

      return (
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Pressable
              className={`
                relative items-center justify-center transition-colors

                hover:bg-fg/5 hover:opacity-100

                ${isDropTarget ? `bg-blue/10` : ``}
                ${leafCellClassName}
              `}
              {...(webDropTargetProps as object)}
            >
              {isNestable ? (
                <View className="absolute right-3 top-3">
                  <DropdownMenu>
                    <DropdownMenu.Trigger>
                      <RectButton variant="bareDim">{`□`}</RectButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.RadioGroup
                        value="leaf"
                        onValueChange={(v) => {
                          if (isVisualOperator(v)) {
                            const { nextNode, overflowLeafs } =
                              buildRootForOperator(v, leaf);
                            if (overflowLeafs.length > 0) {
                              setDraftOverflow((current) => [
                                ...current,
                                ...overflowLeafs,
                              ]);
                            }
                            replaceDraftNodeAtPath(path, nextNode);
                          }
                        }}
                      >
                        <DropdownMenu.RadioItem value="leaf">
                          {`□ Single cell`}
                        </DropdownMenu.RadioItem>
                        {visualOperators.map((op) => (
                          <DropdownMenu.RadioItem key={op} value={op}>
                            {`${op} ${visualOperatorLabels[op]}`}
                          </DropdownMenu.RadioItem>
                        ))}
                      </DropdownMenu.RadioGroup>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </View>
              ) : null}
              {leaf.hanzi == null ? (
                <Text className="text-2xl text-fg/30">{`字`}</Text>
              ) : (
                <Text
                  className={`
                    text-2xl

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
                <Suspense fallback={null}>
                  <StrokePicker
                    strokePaths={strokePaths}
                    selectedStrokes={new Set(parseIndexRanges(leaf.strokes))}
                    onToggle={(i) => {
                      const current = new Set(parseIndexRanges(leaf.strokes));
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
                        ? `size-9 items-center justify-center rounded-md border-2 border-blue bg-bg`
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
          </DropdownMenu.Content>
        </DropdownMenu>
      );
    }

    const [operator, ...children] = node;
    if (!isVisualOperator(operator)) {
      return (
        <View className="gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3">
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
        renderNode(
          child as WikiCharacterDecomposition,
          [...path, childIndex],
          nestableChildIndices(operator).includes(childIndex),
        ),
      );
    }

    const title = `${operator} ${visualOperatorLabels[operator]}`;

    const titleRow = (
      <View
        className={`
          flex-row items-center justify-between border-b-2 border-dashed border-fg/40 px-3 py-2
        `}
      >
        {isNestable ? (
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <RectButton variant="bareDim">{title}</RectButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.RadioGroup
                value={operator}
                onValueChange={(v) => {
                  if (v === `leaf`) {
                    const { leaf, overflowLeafs } = flattenNodeToLeaf(node);
                    if (overflowLeafs.length > 0) {
                      setDraftOverflow((current) => [
                        ...current,
                        ...overflowLeafs,
                      ]);
                    }
                    replaceDraftNodeAtPath(path, leaf);
                  } else if (isVisualOperator(v)) {
                    const { nextNode, overflowLeafs } = buildRootForOperator(
                      v,
                      node,
                    );
                    if (overflowLeafs.length > 0) {
                      setDraftOverflow((current) => [
                        ...current,
                        ...overflowLeafs,
                      ]);
                    }
                    replaceDraftNodeAtPath(path, nextNode);
                  }
                }}
              >
                <DropdownMenu.RadioItem value="leaf">
                  {`□ Single cell`}
                </DropdownMenu.RadioItem>
                {visualOperators.map((op) => (
                  <DropdownMenu.RadioItem key={op} value={op}>
                    {`${op} ${visualOperatorLabels[op]}`}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu>
        ) : (
          <Text className="pyly-body-caption text-fg-dim">{title}</Text>
        )}
      </View>
    );

    if (operator === IdsOperator.LeftToRight) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View className="flex-row">
            <View className="flex-1 border-r-2 border-dashed border-fg/40 p-1">
              {childElements[0]}
            </View>
            <View className="flex-1 p-1">{childElements[1]}</View>
          </View>
        </View>
      );
    }

    if (operator === IdsOperator.AboveToBelow) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View>
            <View className="border-b-2 border-dashed border-fg/40 p-1">
              {childElements[0]}
            </View>
            <View className="p-1">{childElements[1]}</View>
          </View>
        </View>
      );
    }

    if (operator === IdsOperator.LeftToMiddleToRight) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View className="flex-row">
            <View className="flex-1 border-r-2 border-dashed border-fg/40 p-1">
              {childElements[0]}
            </View>
            <View className="flex-1 border-r-2 border-dashed border-fg/40 p-1">
              {childElements[1]}
            </View>
            <View className="flex-1 p-1">{childElements[2]}</View>
          </View>
        </View>
      );
    }

    if (operator === IdsOperator.AboveToMiddleAndBelow) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View>
            <View className="border-b-2 border-dashed border-fg/40 p-1">
              {childElements[0]}
            </View>
            <View className="border-b-2 border-dashed border-fg/40 p-1">
              {childElements[1]}
            </View>
            <View className="p-1">{childElements[2]}</View>
          </View>
        </View>
      );
    }

    if (operator === IdsOperator.FullSurround) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View>
            <View className="border-b-2 border-dashed border-fg/40 p-1">
              {childElements[0]}
            </View>
            <View className="mx-8 p-1">{childElements[1]}</View>
          </View>
        </View>
      );
    }

    if (operator === IdsOperator.SurroundFromAbove) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View>
            <View className="border-b-2 border-dashed border-fg/40 p-1">
              {childElements[0]}
            </View>
            <View className="mx-6 p-1">{childElements[1]}</View>
          </View>
        </View>
      );
    }

    if (operator === IdsOperator.SurroundFromBelow) {
      return (
        <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
          {titleRow}
          <View>
            <View className="mx-6 border-b-2 border-dashed border-fg/40 p-1">
              {childElements[1]}
            </View>
            <View className="p-1">{childElements[0]}</View>
          </View>
        </View>
      );
    }

    return (
      <View className="overflow-hidden rounded-xl border-2 border-dashed border-fg/40">
        {titleRow}
        <View className="flex-row">
          <View className="min-w-16 flex-1 border-r-2 border-dashed border-fg/40 p-1">
            {childElements[0]}
          </View>
          <View className="flex-[2] p-1">{childElements[1]}</View>
        </View>
      </View>
    );
  };

  return (
    <View className="gap-3 rounded-xl border border-fg/10 bg-bg-high p-3">
      <Text className="pyly-body-caption text-fg-dim">
        Choose a base decomposition, then edit each cell visually.
      </Text>
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
        renderNode(draftComponents, [], true)
      )}

      <View className="gap-2 rounded-xl border border-fg/10 bg-bg p-3">
        <Text className="pyly-body-caption text-fg-dim">Overflow cells</Text>
        <Text className="pyly-body-caption text-fg-dim/80">
          Extra cells are kept here while editing. Drag them back into the grid.
        </Text>
        {draftOverflow.length === 0 ? (
          <Text className="pyly-body-caption text-fg-dim">
            No overflow cells.
          </Text>
        ) : (
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
                    {overflowLeaf.hanzi ?? `字`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

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
