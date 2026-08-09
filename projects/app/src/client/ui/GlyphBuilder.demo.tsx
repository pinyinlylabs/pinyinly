import { hanziSvgPathsQuery } from "@/client/query";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { ToggleButton } from "@/client/ui/ToggleButton";
import {
  isHanziCharacter,
  parseIds,
  splitHanziText,
  walkIdsNodeLeafs,
} from "@/data/hanzi";
import type {
  CharacterDecompositionRow,
  HanziCharacter,
  HanziText,
} from "@/data/model";
import { loadBuiltinCharacterDecompositionEntries } from "@/dictionary";
import { nanoid } from "@/util/nanoid";
import { useQueries, useQuery } from "@tanstack/react-query";
import { parseStrokeSpec, strokeSpecFilter } from "@/util/strokeSpec";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import SVGPathCommander from "svg-path-commander";
import { useEffect, useRef, useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { G, Rect, Svg } from "react-native-svg";
import { CopyToClipboardButton } from "./CopyToClipboardButton";
import { RectButton } from "./RectButton";
import { SvgPath } from "./SvgPath";

interface LayerSourceData {
  strokes: string[];
  medians: string[];
}

interface GlyphLayer {
  id: string;
  hanziInput: string;
  hanzi: HanziCharacter | null;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  r: number;
  isVisible: boolean;
  sourceOverride?: LayerSourceData;
}

interface RenderedLayer {
  id: string;
  strokes: string[];
  medians: string[];
  medianStarts: Array<{ x: number; y: number } | null>;
}

interface PathBBox {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

const previewSizePx = 520;
const glyphBuilderStorageKey = `glyphBuilder.demo.v1`;
const glyphBuilderHistoryLimit = 40;
const glyphBuilderSaveDebounceMs = 2000;
const squareHanziInputSize = 44;

interface GlyphBuilderSnapshot {
  layers: GlyphLayer[];
  selectedLayerIds: string[];
  referenceHanziInput: string;
  referenceHanzi: HanziCharacter | null;
  isReferenceVisible: boolean;
}

interface GlyphBuilderPersistedState {
  version: 2;
  current: GlyphBuilderSnapshot;
  past: GlyphBuilderSnapshot[];
  future: GlyphBuilderSnapshot[];
}

function createDefaultLayers(): GlyphLayer[] {
  return [
    {
      ...layerWithDefaults(),
      hanziInput: `好`,
      hanzi: `好` as HanziCharacter,
    },
  ];
}

function snapshotEquals(
  a: GlyphBuilderSnapshot,
  b: GlyphBuilderSnapshot,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sanitizeLayer(layer: unknown): GlyphLayer | null {
  if (typeof layer !== `object` || layer == null) {
    return null;
  }

  const value = layer as Record<string, unknown>;

  const sourceOverrideRaw = value[`sourceOverride`];
  let sourceOverride: LayerSourceData | undefined;
  if (sourceOverrideRaw != null) {
    if (typeof sourceOverrideRaw !== `object`) {
      return null;
    }

    const sourceOverrideValue = sourceOverrideRaw as Record<string, unknown>;
    const sourceOverrideStrokes = sourceOverrideValue[`strokes`];
    const sourceOverrideMedians = sourceOverrideValue[`medians`];
    if (
      !Array.isArray(sourceOverrideStrokes) ||
      !Array.isArray(sourceOverrideMedians) ||
      sourceOverrideStrokes.some((x) => typeof x !== `string`) ||
      sourceOverrideMedians.some((x) => typeof x !== `string`)
    ) {
      return null;
    }

    const narrowedStrokes = sourceOverrideStrokes as string[];
    const narrowedMedians = sourceOverrideMedians as string[];
    sourceOverride = {
      strokes: [...narrowedStrokes],
      medians: [...narrowedMedians],
    };
  }

  const layerId = value[`id`];
  const hanziInput = value[`hanziInput`];
  const layerHanzi = value[`hanzi`];
  const tx = value[`tx`];
  const ty = value[`ty`];
  const sx = value[`sx`];
  const sy = value[`sy`];
  const rotation = value[`r`];
  const isVisible = value[`isVisible`];

  if (
    typeof layerId !== `string` ||
    typeof hanziInput !== `string` ||
    (layerHanzi != null && typeof layerHanzi !== `string`) ||
    typeof tx !== `number` ||
    typeof ty !== `number` ||
    typeof sx !== `number` ||
    typeof sy !== `number` ||
    (rotation != null && typeof rotation !== `number`) ||
    typeof isVisible !== `boolean`
  ) {
    return null;
  }

  return {
    id: layerId,
    hanziInput,
    hanzi: (layerHanzi ?? null) as HanziCharacter | null,
    tx,
    ty,
    sx,
    sy,
    r: rotation ?? 0,
    isVisible,
    sourceOverride,
  };
}

function sanitizeSnapshot(snapshot: unknown): GlyphBuilderSnapshot | null {
  if (typeof snapshot !== `object` || snapshot == null) {
    return null;
  }

  const value = snapshot as Record<string, unknown>;
  const layersRaw = value[`layers`];
  const selectedLayerIdsRaw = value[`selectedLayerIds`];
  if (
    !Array.isArray(layersRaw) ||
    !Array.isArray(selectedLayerIdsRaw) ||
    selectedLayerIdsRaw.some((id) => typeof id !== `string`)
  ) {
    return null;
  }

  const layers = layersRaw
    .map((layer) => sanitizeLayer(layer))
    .filter((layer): layer is GlyphLayer => layer != null);

  const layerIdSet = new Set(layers.map((layer) => layer.id));
  const selectedLayerIds = selectedLayerIdsRaw
    .filter((id): id is string => typeof id === `string`)
    .filter((id) => layerIdSet.has(id));

  const referenceHanziInputRaw = value[`referenceHanziInput`];
  const referenceHanziRaw = value[`referenceHanzi`];
  const isReferenceVisibleRaw = value[`isReferenceVisible`];

  return {
    layers,
    selectedLayerIds,
    referenceHanziInput:
      typeof referenceHanziInputRaw === `string` ? referenceHanziInputRaw : ``,
    referenceHanzi:
      typeof referenceHanziRaw === `string`
        ? (referenceHanziRaw as HanziCharacter)
        : null,
    isReferenceVisible:
      typeof isReferenceVisibleRaw === `boolean`
        ? isReferenceVisibleRaw
        : false,
  };
}

function sanitizePersistedState(
  value: unknown,
): GlyphBuilderPersistedState | null {
  if (typeof value !== `object` || value == null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const version = record[`version`];
  if (version !== 1 && version !== 2) {
    return null;
  }

  const current = sanitizeSnapshot(record[`current`]);
  if (current == null) {
    return null;
  }

  const pastRaw = version === 1 ? record[`history`] : record[`past`];
  const futureRaw = version === 1 ? [] : record[`future`];

  const past = Array.isArray(pastRaw)
    ? pastRaw
        .map((item) => sanitizeSnapshot(item))
        .filter((item): item is GlyphBuilderSnapshot => item != null)
        .slice(-glyphBuilderHistoryLimit)
    : [];
  const future = Array.isArray(futureRaw)
    ? futureRaw
        .map((item) => sanitizeSnapshot(item))
        .filter((item): item is GlyphBuilderSnapshot => item != null)
        .slice(-glyphBuilderHistoryLimit)
    : [];

  return {
    version: 2,
    current,
    past,
    future,
  };
}

function parseSingleHanzi(input: string): HanziCharacter | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const chars = splitHanziText(trimmed as HanziText);
  if (chars.length !== 1) {
    return null;
  }

  const char = chars[0];
  if (char == null || !isHanziCharacter(char)) {
    return null;
  }

  return char;
}

function medianToSvgPath(median: string): string | null {
  const trimmed = median.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^[Mm]/u.test(trimmed)) {
    return trimmed;
  }

  const points = trimmed
    .split(`;`)
    .map((pointText) => pointText.trim())
    .filter((pointText) => pointText.length > 0)
    .map((pointText) => {
      const [xText, yText] = pointText.split(`,`);
      const x = Number(xText);
      const y = Number(yText);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        return null;
      }
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => point != null);

  if (points.length < 2) {
    return null;
  }

  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

function transformPath(
  path: string,
  layer: Pick<GlyphLayer, `tx` | `ty` | `sx` | `sy`>,
): string {
  return new SVGPathCommander(path)
    .transform({
      origin: [0, 0],
      translate: [layer.tx, layer.ty],
      scale: [layer.sx, layer.sy],
    })
    .toString();
}

function rotatePath(
  path: string,
  degrees: number,
  rotationOrigin: { x: number; y: number },
): string {
  return new SVGPathCommander(path)
    .transform({
      origin: [rotationOrigin.x, rotationOrigin.y],
      rotate: degrees,
    })
    .toString();
}

function getPathStartPoint(path: string): { x: number; y: number } | null {
  const match = path.match(
    /^[Mm]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*[, ]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/u,
  );
  if (match == null) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function layerWithDefaults(): GlyphLayer {
  return {
    id: nanoid(),
    hanziInput: ``,
    hanzi: null,
    tx: 0,
    ty: 0,
    sx: 1,
    sy: 1,
    r: 0,
    isVisible: true,
  };
}

function getSourceDataFromRaw(
  raw: { strokes: string[]; medians?: string[] } | null | undefined,
): LayerSourceData | null {
  if (raw == null) {
    return null;
  }

  const medians = (raw.medians ?? [])
    .map((median) => medianToSvgPath(median))
    .map((median) =>
      median == null ? null : transformArphicSpaceSvgPath(median),
    )
    .filter((median): median is string => median != null);

  return {
    strokes: raw.strokes.map((stroke) => transformArphicSpaceSvgPath(stroke)),
    medians,
  };
}

function getPathsBBox(paths: readonly string[]): PathBBox | null {
  let bbox: PathBBox | null = null;

  for (const path of paths) {
    const next = SVGPathCommander.getPathBBox(path);

    bbox =
      bbox == null
        ? { x: next.x, y: next.y, x2: next.x2, y2: next.y2 }
        : {
            x: Math.min(bbox.x, next.x),
            y: Math.min(bbox.y, next.y),
            x2: Math.max(bbox.x2, next.x2),
            y2: Math.max(bbox.y2, next.y2),
          };
  }

  return bbox;
}

function transformLayerPaths(
  paths: readonly string[],
  layer: Pick<GlyphLayer, `tx` | `ty` | `sx` | `sy` | `r`>,
): string[] {
  const translatedScaledPaths = paths.map((path) => transformPath(path, layer));
  if (layer.r === 0) {
    return translatedScaledPaths;
  }

  const rotationOrigin = getLayerRotationOrigin(paths, layer);
  if (rotationOrigin == null) {
    return translatedScaledPaths;
  }

  return translatedScaledPaths.map((path) =>
    rotatePath(path, layer.r, rotationOrigin),
  );
}

function getLayerRotationOrigin(
  paths: readonly string[],
  layer: Pick<GlyphLayer, `tx` | `ty` | `sx` | `sy` | `r`>,
): { x: number; y: number } | null {
  if (layer.r === 0) {
    return null;
  }

  const translatedScaledPaths = paths.map((path) => transformPath(path, layer));
  const bbox = getPathsBBox(translatedScaledPaths);
  if (bbox == null) {
    return null;
  }

  return {
    x: (bbox.x + bbox.x2) / 2,
    y: (bbox.y + bbox.y2) / 2,
  };
}

function transformLayerPathsWithRotationOrigin(
  paths: readonly string[],
  layer: Pick<GlyphLayer, `tx` | `ty` | `sx` | `sy` | `r`>,
  rotationOrigin: { x: number; y: number } | null,
): string[] {
  const translatedScaledPaths = paths.map((path) => transformPath(path, layer));
  if (layer.r === 0 || rotationOrigin == null) {
    return translatedScaledPaths;
  }

  return translatedScaledPaths.map((path) =>
    rotatePath(path, layer.r, rotationOrigin),
  );
}

function roundSvgPathToIntegers(path: string): string {
  return path.replaceAll(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/gu, (valueText) => {
    const value = Number(valueText);
    if (!Number.isFinite(value)) {
      return valueText;
    }

    return String(Math.round(value));
  });
}

function SquareHanziInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <TextInputSingle
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      variant="flat"
      autoCorrect={false}
      autoCapitalize="none"
      className="rounded-md p-0 text-center text-lg"
      style={{
        width: squareHanziInputSize,
        height: squareHanziInputSize,
      }}
    />
  );
}

function PositionNumberInput({
  value,
  placeholder,
  onChangeText,
  onCommitText,
  onStep,
  suffix,
  widthClassName = `w-20`,
}: {
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onCommitText: (text: string) => void;
  onStep: (direction: 1 | -1) => void;
  suffix?: string;
  widthClassName?: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <TextInputSingle
        value={value}
        onChangeText={onChangeText}
        onEndEditing={(event) => {
          onCommitText(event.nativeEvent.text);
        }}
        onSubmitEditing={(event) => {
          onCommitText(event.nativeEvent.text);
        }}
        onKeyPress={(event: {
          nativeEvent: { key: string };
          preventDefault: () => void;
        }) => {
          if (event.nativeEvent.key === `ArrowUp`) {
            event.preventDefault();
            onStep(1);
          }

          if (event.nativeEvent.key === `ArrowDown`) {
            event.preventDefault();
            onStep(-1);
          }
        }}
        placeholder={placeholder}
        variant="flat"
        keyboardType="decimal-pad"
        autoCorrect={false}
        autoCapitalize="none"
        className={`
          ${widthClassName}

          rounded-md p-2 text-center text-sm
        `}
      />
      {suffix == null ? null : (
        <Text className="pyly-body-caption text-fg-dim">{suffix}</Text>
      )}
    </View>
  );
}

function formatLayerNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return `0`;
  }

  const formatted = value.toFixed(3).replace(/0+$/u, ``).replace(/\.$/u, ``);
  return formatted.length > 0 ? formatted : `0`;
}

function formatLayerPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return `0`;
  }

  const clamped = Math.max(0, value);
  return formatLayerNumber(clamped);
}

function isTextEditableElement(element: Element | null): boolean {
  if (element == null || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName;
  return tagName === `INPUT` || tagName === `TEXTAREA` || tagName === `SELECT`;
}

export default function GlyphBuilderDemo() {
  const [layers, setLayers] = useState<GlyphLayer[]>(() =>
    createDefaultLayers(),
  );
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [referenceHanziInput, setReferenceHanziInput] = useState(``);
  const [referenceHanzi, setReferenceHanzi] = useState<HanziCharacter | null>(
    null,
  );
  const [isReferenceVisible, setIsReferenceVisible] = useState(false);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [decompositionEntries, setDecompositionEntries] = useState<
    readonly CharacterDecompositionRow[]
  >([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewWidthPx, setPreviewWidthPx] = useState(previewSizePx);
  const [historyState, setHistoryState] =
    useState<GlyphBuilderPersistedState | null>(null);
  const [positionDrafts, setPositionDrafts] = useState({
    tx: `0`,
    ty: `0`,
    sx: `100`,
    sy: `100`,
    r: `0`,
  });
  const [isPositionAspectRatioLocked, setIsPositionAspectRatioLocked] =
    useState(false);

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    initialLayerOffsets: Map<string, { tx: number; ty: number }>;
  } | null>(null);
  const hasHydratedPersistedStateRef = useRef(false);
  const persistedStateRef = useRef<GlyphBuilderPersistedState | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layerQueries = useQueries({
    queries: layers.map((layer) => hanziSvgPathsQuery(layer.hanzi)),
  });
  const { data: referenceSvgData } = useQuery(
    hanziSvgPathsQuery(referenceHanzi),
  );

  useEffect(() => {
    let cancelled = false;

    loadBuiltinCharacterDecompositionEntries()
      .then((entries) => {
        if (!cancelled) {
          setDecompositionEntries(entries);
        }
      })
      .catch((error: unknown) => {
        console.error(`Failed to load decomposition entries`, error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== `web`) {
      hasHydratedPersistedStateRef.current = true;
      return;
    }

    try {
      const raw = globalThis.localStorage.getItem(glyphBuilderStorageKey);
      if (raw == null) {
        hasHydratedPersistedStateRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      const sanitized = sanitizePersistedState(parsed);
      if (sanitized == null) {
        hasHydratedPersistedStateRef.current = true;
        return;
      }

      persistedStateRef.current = sanitized;
      setHistoryState(sanitized);
      setLayers(
        sanitized.current.layers.length > 0
          ? sanitized.current.layers
          : createDefaultLayers(),
      );
      setSelectedLayerIds(sanitized.current.selectedLayerIds);
      setReferenceHanziInput(sanitized.current.referenceHanziInput);
      setReferenceHanzi(sanitized.current.referenceHanzi);
      setIsReferenceVisible(sanitized.current.isReferenceVisible);
    } catch (error: unknown) {
      console.error(`Failed to load GlyphBuilder persisted state`, error);
    } finally {
      hasHydratedPersistedStateRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedPersistedStateRef.current || Platform.OS !== `web`) {
      return;
    }

    if (saveTimeoutRef.current != null) {
      globalThis.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = globalThis.setTimeout(() => {
      const nextSnapshot: GlyphBuilderSnapshot = {
        layers,
        selectedLayerIds,
        referenceHanziInput,
        referenceHanzi,
        isReferenceVisible,
      };
      const persisted = persistedStateRef.current;
      let nextPast = persisted?.past ?? [];
      let nextFuture = persisted?.future ?? [];

      if (
        persisted?.current != null &&
        !snapshotEquals(persisted.current, nextSnapshot)
      ) {
        const lastPastSnapshot = nextPast.at(-1);
        const shouldAppend =
          lastPastSnapshot == null ||
          !snapshotEquals(lastPastSnapshot, persisted.current);

        if (shouldAppend) {
          nextPast = [...nextPast, persisted.current];
        }

        nextFuture = [];
      }

      if (nextPast.length > glyphBuilderHistoryLimit) {
        nextPast = nextPast.slice(-glyphBuilderHistoryLimit);
      }

      if (nextFuture.length > glyphBuilderHistoryLimit) {
        nextFuture = nextFuture.slice(-glyphBuilderHistoryLimit);
      }

      const nextPersisted: GlyphBuilderPersistedState = {
        version: 2,
        current: nextSnapshot,
        past: nextPast,
        future: nextFuture,
      };

      try {
        globalThis.localStorage.setItem(
          glyphBuilderStorageKey,
          JSON.stringify(nextPersisted),
        );
        persistedStateRef.current = nextPersisted;
        setHistoryState(nextPersisted);
      } catch (error: unknown) {
        console.error(`Failed to persist GlyphBuilder state`, error);
      }
    }, glyphBuilderSaveDebounceMs);

    return () => {
      if (saveTimeoutRef.current != null) {
        globalThis.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    layers,
    selectedLayerIds,
    referenceHanzi,
    referenceHanziInput,
    isReferenceVisible,
  ]);

  const layerSourceDataById = new Map<string, LayerSourceData | null>();
  const layerRawSvgDataById = new Map<
    string,
    {
      strokes: string[];
      medians?: string[];
      segments?: Record<string, string>;
    } | null
  >();
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer == null) {
      continue;
    }

    if (layer.sourceOverride != null) {
      layerSourceDataById.set(layer.id, layer.sourceOverride);
      continue;
    }

    const query = layerQueries[i];
    const queryData = query?.data;
    layerRawSvgDataById.set(layer.id, queryData ?? null);
    layerSourceDataById.set(layer.id, getSourceDataFromRaw(queryData));
  }

  const renderedLayers: RenderedLayer[] = [];
  for (const layer of layers) {
    if (!layer.isVisible) {
      continue;
    }

    const sourceData = layerSourceDataById.get(layer.id);
    if (sourceData == null) {
      continue;
    }

    const transformedStrokes = transformLayerPaths(sourceData.strokes, layer);
    const transformedMedians = transformLayerPaths(sourceData.medians, layer);

    renderedLayers.push({
      id: layer.id,
      strokes: transformedStrokes,
      medians: transformedMedians,
      medianStarts: transformedMedians.map((median) =>
        getPathStartPoint(median),
      ),
    });
  }

  const previewLayers = renderedLayers;

  const referenceSourceData = getSourceDataFromRaw(referenceSvgData);
  const referencePreview =
    !isReferenceVisible || referenceSourceData == null
      ? null
      : {
          strokes: referenceSourceData.strokes,
          medians: referenceSourceData.medians,
        };

  const mergedOutput = {
    strokes: previewLayers
      .flatMap((layer) => layer.strokes)
      .map((stroke) => transformArphicSpaceSvgPath(stroke))
      .map((stroke) => roundSvgPathToIntegers(stroke)),
    medians: previewLayers
      .flatMap((layer) => layer.medians)
      .map((median) => transformArphicSpaceSvgPath(median))
      .map((median) => roundSvgPathToIntegers(median)),
  };
  const mergedOutputText = JSON.stringify(mergedOutput, null, 2);

  const selectedLayers = layers.filter((layer) =>
    selectedLayerIds.includes(layer.id),
  );
  const selectedLayer = selectedLayers[0] ?? null;

  const selectedPositionTx =
    selectedLayers.length === 0
      ? 0
      : selectedLayers.reduce((sum, layer) => sum + layer.tx, 0) /
        selectedLayers.length;
  const selectedPositionTy =
    selectedLayers.length === 0
      ? 0
      : selectedLayers.reduce((sum, layer) => sum + layer.ty, 0) /
        selectedLayers.length;
  const selectedPositionSx =
    selectedLayers.length === 0
      ? 100
      : selectedLayers.reduce(
          (sum, layer) => sum + Math.abs(layer.sx) * 100,
          0,
        ) / selectedLayers.length;
  const selectedPositionSy =
    selectedLayers.length === 0
      ? 100
      : selectedLayers.reduce(
          (sum, layer) => sum + Math.abs(layer.sy) * 100,
          0,
        ) / selectedLayers.length;
  const selectedRotationDeg =
    selectedLayers.length === 0
      ? 0
      : selectedLayers.reduce((sum, layer) => sum + layer.r, 0) /
        selectedLayers.length;

  useEffect(() => {
    if (selectedLayers.length === 0) {
      setPositionDrafts({
        tx: `0`,
        ty: `0`,
        sx: `100`,
        sy: `100`,
        r: `0`,
      });
      return;
    }

    setPositionDrafts({
      tx: formatLayerNumber(selectedPositionTx),
      ty: formatLayerNumber(selectedPositionTy),
      sx: formatLayerPercent(selectedPositionSx),
      sy: formatLayerPercent(selectedPositionSy),
      r: formatLayerNumber(selectedRotationDeg),
    });
  }, [
    selectedLayers.length,
    selectedRotationDeg,
    selectedPositionSx,
    selectedPositionSy,
    selectedPositionTx,
    selectedPositionTy,
  ]);

  useEffect(() => {
    if (Platform.OS !== `web` || selectedLayerIds.length === 0) {
      return;
    }

    const selectedIdSet = new Set(selectedLayerIds);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditableElement(document.activeElement)) {
        return;
      }

      let deltaX = 0;
      let deltaY = 0;

      if (event.key === `ArrowLeft`) {
        deltaX = -1;
      } else if (event.key === `ArrowRight`) {
        deltaX = 1;
      } else if (event.key === `ArrowUp`) {
        deltaY = 1;
      } else if (event.key === `ArrowDown`) {
        deltaY = -1;
      } else {
        return;
      }

      event.preventDefault();
      setLayers((current) =>
        current.map((layer) =>
          selectedIdSet.has(layer.id)
            ? {
                ...layer,
                tx: layer.tx + deltaX,
                ty: layer.ty + deltaY,
              }
            : layer,
        ),
      );
    };

    globalThis.addEventListener(`keydown`, handleKeyDown);

    return () => {
      globalThis.removeEventListener(`keydown`, handleKeyDown);
    };
  }, [selectedLayerIds]);

  const decompositionOptions =
    selectedLayer?.hanzi == null
      ? []
      : decompositionEntries.filter(
          (entry) => entry.hanzi === selectedLayer.hanzi,
        );

  const hasSelectedLayers = selectedLayerIds.length > 0;

  const updateLayer = (
    layerId: string,
    updater: (layer: GlyphLayer) => GlyphLayer,
  ) => {
    setLayers((current) =>
      current.map((layer) => {
        if (layer.id !== layerId) {
          return layer;
        }

        return updater(layer);
      }),
    );
  };

  const updateSelectedLayers = (updater: (layer: GlyphLayer) => GlyphLayer) => {
    setLayers((current) =>
      current.map((layer) =>
        selectedLayerIds.includes(layer.id) ? updater(layer) : layer,
      ),
    );
  };

  const setSelectedLayerNumericField = (
    field: `tx` | `ty` | `sx` | `sy`,
    value: number,
  ) => {
    updateSelectedLayers((layer) => {
      if (field === `tx`) {
        return { ...layer, tx: value };
      }

      if (field === `ty`) {
        return { ...layer, ty: value };
      }

      if (field === `sx`) {
        return { ...layer, sx: value };
      }

      return { ...layer, sy: value };
    });
  };

  const setSelectedLayerScalePercent = (
    field: `sx` | `sy`,
    percent: number,
  ) => {
    const clampedPercent = Math.max(0, percent);
    const scaleValue = clampedPercent / 100;

    const selectedPathsBBox = getPathsBBox(
      selectedLayers.flatMap((layer) => {
        const sourceData = layerSourceDataById.get(layer.id);
        if (sourceData == null) {
          return [];
        }

        return transformLayerPaths(sourceData.strokes, layer);
      }),
    );
    const anchorX =
      selectedPathsBBox == null
        ? null
        : (selectedPathsBBox.x + selectedPathsBBox.x2) / 2;
    const anchorY =
      selectedPathsBBox == null
        ? null
        : (selectedPathsBBox.y + selectedPathsBBox.y2) / 2;

    updateSelectedLayers((layer) => {
      const currentAbsSx = Math.abs(layer.sx);
      const currentAbsSy = Math.abs(layer.sy);

      let nextAbsSx = currentAbsSx;
      let nextAbsSy = currentAbsSy;

      if (isPositionAspectRatioLocked) {
        if (field === `sx`) {
          const ratio =
            currentAbsSx === 0
              ? null
              : scaleValue / Math.max(currentAbsSx, 1e-9);
          nextAbsSx = scaleValue;
          nextAbsSy = ratio == null ? currentAbsSy : currentAbsSy * ratio;
        } else {
          const ratio =
            currentAbsSy === 0
              ? null
              : scaleValue / Math.max(currentAbsSy, 1e-9);
          nextAbsSy = scaleValue;
          nextAbsSx = ratio == null ? currentAbsSx : currentAbsSx * ratio;
        }
      } else if (field === `sx`) {
        nextAbsSx = scaleValue;
      } else {
        nextAbsSy = scaleValue;
      }

      const nextScaleX = (layer.sx < 0 ? -1 : 1) * nextAbsSx;
      const nextScaleY = (layer.sy < 0 ? -1 : 1) * nextAbsSy;

      const scaleRatioX = layer.sx === 0 ? null : nextScaleX / layer.sx;
      const scaleRatioY = layer.sy === 0 ? null : nextScaleY / layer.sy;

      const nextTx =
        anchorX == null || scaleRatioX == null
          ? layer.tx
          : anchorX + (layer.tx - anchorX) * scaleRatioX;
      const nextTy =
        anchorY == null || scaleRatioY == null
          ? layer.ty
          : anchorY + (layer.ty - anchorY) * scaleRatioY;

      return {
        ...layer,
        tx: nextTx,
        ty: nextTy,
        sx: nextScaleX,
        sy: nextScaleY,
      };
    });
  };

  const stepPositionField = (
    field: `tx` | `ty` | `sx` | `sy` | `r`,
    direction: 1 | -1,
  ) => {
    if (field === `tx`) {
      setSelectedLayerNumericField(field, selectedPositionTx + direction);
      return;
    }

    if (field === `ty`) {
      setSelectedLayerNumericField(field, selectedPositionTy + direction);
      return;
    }

    if (field === `r`) {
      stepRotationField(direction);
      return;
    }

    const currentPercent =
      field === `sx` ? selectedPositionSx : selectedPositionSy;
    setSelectedLayerScalePercent(field, currentPercent + direction);
  };

  const setSelectedLayerRotation = (value: number) => {
    updateSelectedLayers((layer) => ({
      ...layer,
      r: value,
    }));
  };

  const stepRotationField = (direction: 1 | -1) => {
    setSelectedLayerRotation(selectedRotationDeg + direction);
  };

  const flipSelectedLayerAxis = (field: `sx` | `sy`) => {
    const selectedPathsBBox = getPathsBBox(
      selectedLayers.flatMap((layer) => {
        const sourceData = layerSourceDataById.get(layer.id);
        if (sourceData == null) {
          return [];
        }

        return transformLayerPaths(sourceData.strokes, layer);
      }),
    );
    const anchorX =
      selectedPathsBBox == null
        ? null
        : (selectedPathsBBox.x + selectedPathsBBox.x2) / 2;
    const anchorY =
      selectedPathsBBox == null
        ? null
        : (selectedPathsBBox.y + selectedPathsBBox.y2) / 2;

    updateSelectedLayers((layer) => {
      if (field === `sx`) {
        return {
          ...layer,
          sx: -layer.sx,
          tx: anchorX == null ? layer.tx : 2 * anchorX - layer.tx,
        };
      }

      return {
        ...layer,
        sy: -layer.sy,
        ty: anchorY == null ? layer.ty : 2 * anchorY - layer.ty,
      };
    });
  };

  const commitPositionDraft = (
    field: `tx` | `ty` | `sx` | `sy` | `r`,
    valueText: string,
  ) => {
    const parsed = Number(valueText);
    if (!Number.isFinite(parsed)) {
      return;
    }

    if (field === `r`) {
      setSelectedLayerRotation(parsed);
    } else if (field === `sx` || field === `sy`) {
      setSelectedLayerScalePercent(field, parsed);
    } else {
      setSelectedLayerNumericField(field, parsed);
    }
    setPositionDrafts((current) => ({
      ...current,
      [field]:
        field === `sx` || field === `sy`
          ? formatLayerPercent(parsed)
          : formatLayerNumber(parsed),
    }));
  };

  const applySnapshot = (snapshot: GlyphBuilderSnapshot) => {
    setLayers(
      snapshot.layers.length > 0 ? snapshot.layers : createDefaultLayers(),
    );
    setSelectedLayerIds(snapshot.selectedLayerIds);
    setReferenceHanziInput(snapshot.referenceHanziInput);
    setReferenceHanzi(snapshot.referenceHanzi);
    setIsReferenceVisible(snapshot.isReferenceVisible);
  };

  const setPersistedHistory = (nextPersisted: GlyphBuilderPersistedState) => {
    persistedStateRef.current = nextPersisted;
    setHistoryState(nextPersisted);
  };

  const undo = () => {
    const current = historyState;
    if (current == null || current.past.length === 0) {
      return;
    }

    const nextCurrent = current.past.at(-1);
    if (nextCurrent == null) {
      return;
    }

    const nextPersisted: GlyphBuilderPersistedState = {
      version: 2,
      current: nextCurrent,
      past: current.past.slice(0, -1),
      future: [current.current, ...current.future].slice(
        0,
        glyphBuilderHistoryLimit,
      ),
    };

    setPersistedHistory(nextPersisted);
    applySnapshot(nextCurrent);
  };

  const redo = () => {
    const current = historyState;
    if (current == null || current.future.length === 0) {
      return;
    }

    const nextCurrent = current.future.at(0);
    if (nextCurrent == null) {
      return;
    }

    const nextPersisted: GlyphBuilderPersistedState = {
      version: 2,
      current: nextCurrent,
      past: [...current.past, current.current].slice(-glyphBuilderHistoryLimit),
      future: current.future.slice(1),
    };

    setPersistedHistory(nextPersisted);
    applySnapshot(nextCurrent);
  };

  const setLayerHanziInput = (layerId: string, text: string) => {
    updateLayer(layerId, (layer) => {
      const resetLayer = layerWithDefaults();

      return {
        ...layer,
        tx: resetLayer.tx,
        ty: resetLayer.ty,
        sx: resetLayer.sx,
        sy: resetLayer.sy,
        r: resetLayer.r,
        hanziInput: text,
        hanzi: parseSingleHanzi(text),
        sourceOverride: undefined,
      };
    });
  };

  const addLayer = () => {
    const next = layerWithDefaults();
    setLayers((current) => [...current, next]);
    setSelectedLayerIds([next.id]);
  };

  const moveLayer = (layerId: string, direction: `up` | `down`) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === layerId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === `up` ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const a = next[index];
      const b = next[targetIndex];
      if (a == null || b == null) {
        return current;
      }

      next[index] = b;
      next[targetIndex] = a;
      return next;
    });
  };

  const removeSelectedLayers = () => {
    if (selectedLayerIds.length === 0) {
      return;
    }

    setLayers((current) =>
      current.filter((layer) => !selectedLayerIds.includes(layer.id)),
    );
    setSelectedLayerIds([]);
  };

  const clearSelectedLayers = () => {
    setSelectedLayerIds([]);
  };

  const handleSelectLayer = (layerId: string, event: GestureResponderEvent) => {
    const nativeEvent =
      event.nativeEvent as GestureResponderEvent[`nativeEvent`] & {
        shiftKey?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
      };

    const isMultiSelect =
      nativeEvent.shiftKey === true ||
      nativeEvent.ctrlKey === true ||
      nativeEvent.metaKey === true;

    setSelectedLayerIds((current) => {
      if (!isMultiSelect) {
        return [layerId];
      }

      if (current.includes(layerId)) {
        return current.filter((id) => id !== layerId);
      }

      return [...current, layerId];
    });
  };

  const decomposeSelectedLayer = async (entry: CharacterDecompositionRow) => {
    if (selectedLayer == null || selectedLayer.hanzi == null) {
      return;
    }

    const selectedLayerSnapshot = selectedLayer;
    const parentSourceData = layerSourceDataById.get(selectedLayerSnapshot.id);
    if (parentSourceData == null) {
      setNotice(`Load the selected layer glyph data first before decomposing.`);
      return;
    }

    const parentRawSvgData = layerRawSvgDataById.get(selectedLayerSnapshot.id);
    const parentSegmentPathsByAtom = parentRawSvgData?.segments ?? null;
    const parentRotationOrigin = getLayerRotationOrigin(
      parentSourceData.strokes,
      selectedLayerSnapshot,
    );

    const leafCharacters = [...walkIdsNodeLeafs(parseIds(entry.ids))]
      .filter((leaf) => isHanziCharacter(leaf as HanziText))
      .map((leaf) => leaf as HanziCharacter);

    const nextLayers: GlyphLayer[] = [];
    let missingCount = 0;

    for (const [componentIndex, leaf] of leafCharacters.entries()) {
      const componentStrokeSpec = entry.strokeSpecs[componentIndex];
      if (
        componentStrokeSpec == null ||
        componentStrokeSpec.trim().length === 0
      ) {
        missingCount += 1;
        continue;
      }

      let componentStrokes: string[];
      try {
        componentStrokes = strokeSpecFilter(
          parentSourceData.strokes,
          parentSegmentPathsByAtom,
          componentStrokeSpec,
        );
      } catch (error: unknown) {
        console.error(
          `Failed to extract parent strokes for component ${leaf} with strokeSpec ${componentStrokeSpec}`,
          error,
        );
        missingCount += 1;
        continue;
      }

      const componentMedians: string[] = [];
      const parsedSpec = parseStrokeSpec(componentStrokeSpec);
      for (const item of parsedSpec) {
        for (const atom of item) {
          if (atom.kind === `range`) {
            for (let i = atom.start; i <= atom.end; i += 1) {
              const median = parentSourceData.medians[i];
              if (median != null) {
                componentMedians.push(median);
              }
            }
          } else {
            const median = parentSourceData.medians[atom.stroke];
            if (median != null) {
              componentMedians.push(median);
            }
          }
        }
      }

      if (componentStrokes.length === 0) {
        missingCount += 1;
        continue;
      }

      const transformedComponentStrokes = transformLayerPathsWithRotationOrigin(
        componentStrokes,
        selectedLayerSnapshot,
        parentRotationOrigin,
      );
      const transformedComponentMedians = transformLayerPathsWithRotationOrigin(
        componentMedians,
        selectedLayerSnapshot,
        parentRotationOrigin,
      );

      nextLayers.push({
        ...layerWithDefaults(),
        hanziInput: leaf,
        hanzi: leaf,
        isVisible: selectedLayerSnapshot.isVisible,
        // Bake parent transform into child component paths to preserve placement.
        sourceOverride: {
          strokes: transformedComponentStrokes,
          medians: transformedComponentMedians,
        },
        tx: 0,
        ty: 0,
        sx: 1,
        sy: 1,
        r: 0,
      });
    }

    if (nextLayers.length === 0) {
      setNotice(
        `Could not derive component paths from the selected layer stroke specs.`,
      );
      return;
    }

    setLayers((current) => {
      const parentIndex = current.findIndex(
        (layer) => layer.id === selectedLayerSnapshot.id,
      );
      if (parentIndex === -1) {
        return current;
      }

      return [
        ...current.slice(0, parentIndex),
        ...nextLayers,
        ...current.slice(parentIndex + 1),
      ];
    });

    setSelectedLayerIds(nextLayers.map((layer) => layer.id));

    if (missingCount > 0) {
      setNotice(
        `Decomposed layer, but ${missingCount} child layer(s) could not be derived from stroke specs.`,
      );
    } else {
      setNotice(`Layer decomposed into child layers.`);
    }
  };

  const splitSelectedLayerIntoStrokes = () => {
    if (selectedLayer == null) {
      return;
    }

    const selectedLayerSnapshot = selectedLayer;
    const sourceData = layerSourceDataById.get(selectedLayerSnapshot.id);
    if (sourceData == null) {
      setNotice(`Load the selected layer glyph data first before splitting.`);
      return;
    }

    if (sourceData.strokes.length === 0) {
      setNotice(`Selected layer has no strokes to split.`);
      return;
    }

    const transformedStrokes = transformLayerPaths(
      sourceData.strokes,
      selectedLayerSnapshot,
    );
    const transformedMedians = transformLayerPaths(
      sourceData.medians,
      selectedLayerSnapshot,
    );

    const nextLayers = transformedStrokes.map((stroke, index) => {
      const median = transformedMedians[index];
      return {
        ...layerWithDefaults(),
        hanziInput: ``,
        hanzi: null,
        isVisible: selectedLayerSnapshot.isVisible,
        sourceOverride: {
          strokes: [stroke],
          medians: median == null ? [] : [median],
        },
        tx: 0,
        ty: 0,
        sx: 1,
        sy: 1,
        r: 0,
      };
    });

    setLayers((current) => {
      const selectedIndex = current.findIndex(
        (layer) => layer.id === selectedLayerSnapshot.id,
      );
      if (selectedIndex === -1) {
        return current;
      }

      return [
        ...current.slice(0, selectedIndex),
        ...nextLayers,
        ...current.slice(selectedIndex + 1),
      ];
    });

    setSelectedLayerIds(nextLayers.map((layer) => layer.id));
    setNotice(`Split layer into ${nextLayers.length} stroke layer(s).`);
  };

  const onPreviewLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(1, Math.floor(event.nativeEvent.layout.width));
    setPreviewWidthPx(nextWidth);
  };

  const previewScale = 1024 / Math.max(1, previewWidthPx);

  const movableSelectedLayerIds = selectedLayerIds;

  const onPreviewGrant = (event: GestureResponderEvent) => {
    if (movableSelectedLayerIds.length === 0) {
      return;
    }

    const initialLayerOffsets = new Map<string, { tx: number; ty: number }>();
    for (const layerId of movableSelectedLayerIds) {
      const layer = layers.find((candidate) => candidate.id === layerId);
      if (layer == null) {
        continue;
      }
      initialLayerOffsets.set(layerId, { tx: layer.tx, ty: layer.ty });
    }

    dragStateRef.current = {
      startX: event.nativeEvent.pageX,
      startY: event.nativeEvent.pageY,
      initialLayerOffsets,
    };
  };

  const onPreviewMove = (event: GestureResponderEvent) => {
    const dragState = dragStateRef.current;
    if (dragState == null || dragState.initialLayerOffsets.size === 0) {
      return;
    }

    const nativeEvent =
      event.nativeEvent as GestureResponderEvent[`nativeEvent`] & {
        shiftKey?: boolean;
      };
    const rawDx = (event.nativeEvent.pageX - dragState.startX) * previewScale;
    const rawDy = (event.nativeEvent.pageY - dragState.startY) * previewScale;

    let dx = rawDx;
    let dy = rawDy;

    if (nativeEvent.shiftKey === true) {
      const lockedAxis = Math.abs(rawDx) > Math.abs(rawDy) ? `x` : `y`;

      if (lockedAxis === `x`) {
        dy = 0;
      } else {
        dx = 0;
      }
    }

    setLayers((current) =>
      current.map((layer) => {
        const base = dragState.initialLayerOffsets.get(layer.id);
        if (base == null) {
          return layer;
        }

        return {
          ...layer,
          tx: Math.round(base.tx + dx),
          ty: Math.round(base.ty + dy),
        };
      }),
    );
  };

  const onPreviewRelease = () => {
    dragStateRef.current = null;
  };

  if (Platform.OS !== `web`) {
    return (
      <View className="gap-2">
        <Text className="pyly-body">
          GlyphBuilder demo is currently web-only.
        </Text>
      </View>
    );
  }

  return (
    <View className="w-full gap-4">
      {notice == null ? null : (
        <Text className="pyly-body-caption text-amber">{notice}</Text>
      )}

      <View className="h-[680px] min-h-[680px] flex-row gap-4">
        <View className="w-[320px] gap-3 rounded-xl border border-fg/15 bg-bg-high p-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-base font-semibold text-fg">
              Layers
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                addLayer();
              }}
              iconStart="plus"
            />
          </View>
          <ScrollView contentContainerClassName="flex-1">
            <View className="gap-2 pr-2">
              {layers.map((layer) => {
                const isSelected = selectedLayerIds.includes(layer.id);

                return (
                  <Pressable
                    key={layer.id}
                    className={`
                      gap-2 rounded-lg border p-2

                      ${isSelected ? `border-blue bg-blue/10` : `border-fg/15 bg-bg`}
                    `}
                    onPress={(event) => {
                      handleSelectLayer(layer.id, event);
                    }}
                    onHoverIn={() => {
                      setHoveredLayerId(layer.id);
                    }}
                    onHoverOut={() => {
                      setHoveredLayerId((current) =>
                        current === layer.id ? null : current,
                      );
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <ToggleButton
                          isActive={layer.isVisible}
                          onPress={() => {
                            updateLayer(layer.id, (current) => ({
                              ...current,
                              isVisible: !current.isVisible,
                            }));
                          }}
                        />

                        <SquareHanziInput
                          value={layer.hanziInput}
                          onChangeText={(text) => {
                            setLayerHanziInput(layer.id, text);
                          }}
                          placeholder="字"
                        />
                      </View>

                      <View className="flex-row items-center gap-1">
                        <RectButton
                          variant="bareDim"
                          onPress={() => {
                            moveLayer(layer.id, `up`);
                          }}
                        >
                          ↑
                        </RectButton>
                        <RectButton
                          variant="bareDim"
                          onPress={() => {
                            moveLayer(layer.id, `down`);
                          }}
                        >
                          ↓
                        </RectButton>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              className="flex-1"
              onPress={() => {
                clearSelectedLayers();
              }}
            />
          </ScrollView>

          <View className="flex-row items-center gap-2">
            <RectButton
              variant="bareDim"
              onPress={undo}
              disabled={historyState?.past.length === 0}
            >
              Undo
            </RectButton>
            <RectButton
              variant="bareDim"
              onPress={redo}
              disabled={historyState?.future.length === 0}
            >
              Redo
            </RectButton>
            <RectButton
              variant="bareDim"
              onPress={removeSelectedLayers}
              disabled={selectedLayerIds.length === 0}
            >
              Delete
            </RectButton>
          </View>
        </View>

        <View className="flex-1 gap-3 rounded-xl border border-fg/15 bg-bg-high p-3">
          <Text className="font-sans text-base font-semibold text-fg">
            Preview
          </Text>
          <View className="max-h-[400px] max-w-[400px]">
            <View
              className="aspect-square h-full rounded-lg border border-fg/20 bg-white"
              onLayout={onPreviewLayout}
              onStartShouldSetResponder={() => hasSelectedLayers}
              onMoveShouldSetResponder={() => hasSelectedLayers}
              onResponderGrant={onPreviewGrant}
              onResponderMove={onPreviewMove}
              onResponderRelease={onPreviewRelease}
              onResponderTerminate={onPreviewRelease}
            >
              <Svg width="100%" height="100%" viewBox="0 0 1024 1024">
                <SvgPath
                  d="M 0 0 L 1024 1024"
                  fill="none"
                  strokeClassName="accent-zinc-200"
                  strokeWidth={4}
                  strokeDasharray="18 14"
                  strokeLinecap="round"
                />
                <SvgPath
                  d="M 0 1024 L 1024 0"
                  fill="none"
                  strokeClassName="accent-zinc-200"
                  strokeWidth={4}
                  strokeDasharray="18 14"
                  strokeLinecap="round"
                />
                <SvgPath
                  d="M 112 112 L 912 112 L 912 912 L 112 912 Z"
                  fill="none"
                  strokeClassName="accent-zinc-200"
                  strokeWidth={4}
                  strokeDasharray="18 14"
                  strokeLinecap="round"
                />
                <SvgPath
                  d="M 512 0 L 512 1024"
                  fill="none"
                  strokeClassName="accent-zinc-200"
                  strokeWidth={4}
                  strokeDasharray="18 14"
                  strokeLinecap="round"
                />
                <SvgPath
                  d="M 0 512 L 1024 512"
                  fill="none"
                  strokeClassName="accent-zinc-200"
                  strokeWidth={4}
                  strokeDasharray="18 14"
                  strokeLinecap="round"
                />
                {referencePreview == null ? null : (
                  <G>
                    {referencePreview.strokes.map((stroke, index) => (
                      <SvgPath
                        key={`reference:stroke:${index}`}
                        d={stroke}
                        fillClassName="accent-fg/25"
                        strokeClassName="accent-fg/25"
                        strokeWidth={8}
                      />
                    ))}
                    {referencePreview.medians.map((median, index) => (
                      <SvgPath
                        key={`reference:median:${index}`}
                        d={median}
                        fill="none"
                        strokeClassName="accent-fg-loud/35"
                        strokeWidth={8}
                        strokeDasharray="14 10"
                        strokeLinecap="round"
                      />
                    ))}
                  </G>
                )}
                {previewLayers.map((layer) => {
                  const isSelected = selectedLayerIds.includes(layer.id);
                  const isHovered = hoveredLayerId === layer.id;
                  const layerToneClassName = isHovered
                    ? `accent-yellow`
                    : isSelected
                      ? `accent-blue`
                      : `accent-zinc-800`;

                  return (
                    <G key={layer.id}>
                      {layer.strokes.map((stroke, index) => (
                        <SvgPath
                          key={`${layer.id}:stroke:${index}`}
                          d={stroke}
                          fillClassName={layerToneClassName}
                          strokeClassName={layerToneClassName}
                          strokeWidth={8}
                        />
                      ))}

                      {layer.medians.map((median, index) => (
                        <SvgPath
                          key={`${layer.id}:median:${index}`}
                          d={median}
                          fill="none"
                          strokeClassName="accent-zinc-200"
                          strokeWidth={8}
                          strokeDasharray="14 10"
                          strokeLinecap="round"
                        />
                      ))}

                      {layer.medianStarts.map((startPoint, index) => {
                        if (startPoint == null) {
                          return null;
                        }

                        const markerSize = 24;
                        const halfMarker = markerSize / 2;

                        return (
                          <Rect
                            key={`${layer.id}:median-start:${index}`}
                            x={startPoint.x - halfMarker}
                            y={startPoint.y - halfMarker}
                            width={markerSize}
                            height={markerSize}
                            fill="#d4d4d8"
                          />
                        );
                      })}
                    </G>
                  );
                })}
              </Svg>
            </View>
          </View>

          <View className="flex-row items-center justify-center gap-2">
            <SquareHanziInput
              value={referenceHanziInput}
              onChangeText={(text) => {
                setReferenceHanziInput(text);
                setReferenceHanzi(parseSingleHanzi(text));
              }}
              placeholder="参考"
            />
            <ToggleButton
              isActive={isReferenceVisible}
              onPress={() => {
                setIsReferenceVisible((current) => !current);
              }}
            />
          </View>
        </View>

        <View className="w-[360px] gap-3 rounded-xl border border-fg/15 bg-bg-high p-3">
          <Text className="font-sans text-base font-semibold text-fg">
            Inspector
          </Text>
          {selectedLayers.length === 0 ? (
            <Text className="pyly-body-caption text-fg-dim">
              Select one or more layers to edit them.
            </Text>
          ) : (
            <View className="gap-3">
              <Text className="pyly-body-caption text-fg-dim">
                Selected: {selectedLayers.length} layer(s)
              </Text>
              <Text className="pyly-body-caption text-fg-dim">
                Drag on preview to move selected layers.
              </Text>

              <View className="gap-2 rounded-lg border border-fg/15 bg-bg p-2">
                <Text className="pyly-body-caption text-fg-dim">Position</Text>
                <View className="flex-row gap-2">
                  <View className="gap-1">
                    <Text className="pyly-body-caption text-fg-dim">x</Text>
                    <PositionNumberInput
                      value={positionDrafts.tx}
                      onChangeText={(text) => {
                        setPositionDrafts((current) => ({
                          ...current,
                          tx: text,
                        }));
                      }}
                      onCommitText={(text) => {
                        commitPositionDraft(`tx`, text);
                      }}
                      onStep={(direction) => {
                        stepPositionField(`tx`, direction);
                      }}
                      placeholder="0"
                    />
                  </View>

                  <View className="gap-1">
                    <Text className="pyly-body-caption text-fg-dim">y</Text>
                    <PositionNumberInput
                      value={positionDrafts.ty}
                      onChangeText={(text) => {
                        setPositionDrafts((current) => ({
                          ...current,
                          ty: text,
                        }));
                      }}
                      onCommitText={(text) => {
                        commitPositionDraft(`ty`, text);
                      }}
                      onStep={(direction) => {
                        stepPositionField(`ty`, direction);
                      }}
                      placeholder="0"
                    />
                  </View>
                </View>

                <View className="flex-row items-end justify-between gap-2">
                  <View className="flex-row gap-2">
                    <View className="gap-1">
                      <Text className="pyly-body-caption text-fg-dim">
                        hScale
                      </Text>
                      <PositionNumberInput
                        value={positionDrafts.sx}
                        onChangeText={(text) => {
                          setPositionDrafts((current) => ({
                            ...current,
                            sx: text,
                          }));
                        }}
                        onCommitText={(text) => {
                          commitPositionDraft(`sx`, text);
                        }}
                        onStep={(direction) => {
                          stepPositionField(`sx`, direction);
                        }}
                        placeholder="100"
                        suffix="%"
                      />
                    </View>

                    <View className="gap-1">
                      <Text className="pyly-body-caption text-fg-dim">
                        vScale
                      </Text>
                      <PositionNumberInput
                        value={positionDrafts.sy}
                        onChangeText={(text) => {
                          setPositionDrafts((current) => ({
                            ...current,
                            sy: text,
                          }));
                        }}
                        onCommitText={(text) => {
                          commitPositionDraft(`sy`, text);
                        }}
                        onStep={(direction) => {
                          stepPositionField(`sy`, direction);
                        }}
                        placeholder="100"
                        suffix="%"
                      />
                    </View>
                  </View>

                  <View className="items-center gap-1">
                    <Text className="pyly-body-caption text-fg-dim">Lock</Text>
                    <ToggleButton
                      isActive={isPositionAspectRatioLocked}
                      onPress={() => {
                        setIsPositionAspectRatioLocked((current) => !current);
                      }}
                    />
                  </View>
                </View>
              </View>

              <View className="gap-2 rounded-lg border border-fg/15 bg-bg p-2">
                <Text className="pyly-body-caption text-fg-dim">
                  Rotate / Mirror
                </Text>
                <View className="flex-row flex-wrap items-end gap-2">
                  <View className="gap-1">
                    <Text className="pyly-body-caption text-fg-dim">
                      Rotate
                    </Text>
                    <PositionNumberInput
                      value={positionDrafts.r}
                      onChangeText={(text) => {
                        setPositionDrafts((current) => ({
                          ...current,
                          r: text,
                        }));
                      }}
                      onCommitText={(text) => {
                        commitPositionDraft(`r`, text);
                      }}
                      onStep={(direction) => {
                        stepPositionField(`r`, direction);
                      }}
                      placeholder="0"
                      suffix="°"
                      widthClassName="w-24"
                    />
                  </View>

                  <RectButton
                    variant="bareDim"
                    onPress={() => {
                      flipSelectedLayerAxis(`sx`);
                    }}
                  >
                    Flip X
                  </RectButton>
                  <RectButton
                    variant="bareDim"
                    onPress={() => {
                      flipSelectedLayerAxis(`sy`);
                    }}
                  >
                    Flip Y
                  </RectButton>
                </View>
              </View>

              {selectedLayers.length === 1 ? (
                <View className="gap-2 rounded-lg border border-fg/15 bg-bg p-2">
                  {decompositionOptions.length > 0 ? (
                    <Text className="pyly-body-caption text-fg-dim">
                      Decompose into:
                    </Text>
                  ) : null}
                  <View className="flex-row flex-wrap items-start gap-1">
                    <RectButton
                      variant="bareDim"
                      onPress={() => {
                        splitSelectedLayerIntoStrokes();
                      }}
                    >
                      split all
                    </RectButton>
                    {decompositionOptions.map((entry, index) => (
                      <RectButton
                        key={`${entry.hanzi}:${index}`}
                        variant="bare"
                        onPress={() => {
                          void decomposeSelectedLayer(entry);
                        }}
                      >
                        {entry.ids}
                      </RectButton>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          <View className="h-px bg-fg/15" />

          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-sans text-base font-semibold text-fg">
              Merged output JSON
            </Text>
            <CopyToClipboardButton text={mergedOutputText} />
          </View>
          <ScrollView className="max-h-[340px] rounded-lg border border-fg/15 bg-bg p-2">
            <Text className="font-mono text-xs leading-5 text-fg">
              {mergedOutputText}
            </Text>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
