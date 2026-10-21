import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { SvgPath } from "@/client/ui/SvgPath";
import { ButtonGroup } from "@/client/ui/ButtonGroup";
import { hanziCharacterWritingSimilarityThreshold } from "@/data/questions/hanziCharacterWriting";
import type {
  ShapeContextGrade,
  ShapeContextOptions,
  WritingStrokePoint,
} from "@/util/shapeContextGrader";
import { gradeCharacterShape } from "@/util/shapeContextGrader";
import { useState } from "react";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { Switch } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

type DebugLayerKind =
  | `source`
  | `target`
  | `registered`
  | `correspondences`
  | `sourceGrid`
  | `registeredGrid`
  | `residual`
  | `deformation`;

const debugLayerLabels: Record<DebugLayerKind, string> = {
  source: `Original handwritten shape`,
  target: `Reference shape`,
  registered: `Registered handwriting`,
  correspondences: `Point correspondences`,
  sourceGrid: `Original deformation grid`,
  registeredGrid: `TPS-transformed grid`,
  residual: `Residual error heatmap`,
  deformation: `Deformation vectors`,
};

function canvasPoint(point: WritingStrokePoint): WritingStrokePoint {
  return { x: 512 + point.x * 300, y: 512 + point.y * 300 };
}

function pathFromPoints(points: readonly WritingStrokePoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

function residualColor(distance: number): string {
  return distance < 0.08 ? `#22c55e` : distance < 0.2 ? `#f59e0b` : `#ef4444`;
}

function Slider({
  label,
  minimum,
  maximum,
  step,
  value,
  formatValue,
  onValueChange,
  onValueChangeComplete,
}: {
  label: string;
  minimum: number;
  maximum: number;
  step: number;
  value: number;
  formatValue: (value: number) => string;
  onValueChange: (value: number) => void;
  onValueChangeComplete: (value: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const boundedValue = Math.max(minimum, Math.min(maximum, value));

  function valueFromEvent(event: GestureResponderEvent) {
    const ratio = Math.max(
      0,
      Math.min(1, event.nativeEvent.locationX / Math.max(1, width)),
    );
    const rawValue = minimum + ratio * (maximum - minimum);
    const nextValue = Math.max(
      minimum,
      Math.min(
        maximum,
        Math.round((rawValue - minimum) / step) * step + minimum,
      ),
    );
    return nextValue;
  }

  function updateValue(event: GestureResponderEvent) {
    onValueChange(valueFromEvent(event));
  }

  function updateWidth(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function finish(event: GestureResponderEvent) {
    const nextValue = valueFromEvent(event);
    onValueChange(nextValue);
    onValueChangeComplete(nextValue);
  }

  return (
    <View className="gap-1">
      <Text className="text-sm text-fg">
        {label}: {formatValue(boundedValue)}
      </Text>
      <View
        className="h-8 justify-center"
        onLayout={updateWidth}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={updateValue}
        onResponderMove={updateValue}
        onResponderRelease={finish}
        onAccessibilityAction={(event) => {
          const delta =
            event.nativeEvent.actionName === `increment` ? step : -step;
          const nextValue = Math.max(
            minimum,
            Math.min(maximum, boundedValue + delta),
          );
          onValueChange(nextValue);
          onValueChangeComplete(nextValue);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: minimum,
          max: maximum,
          now: boundedValue,
        }}
        accessibilityActions={[
          { name: `increment`, label: `Increase ${label}` },
          { name: `decrement`, label: `Decrease ${label}` },
        ]}
      >
        <View className="h-1 rounded-full bg-muted" />
        <View
          className="absolute size-4 rounded-full bg-fg-loud"
          style={{
            left: `${((boundedValue - minimum) / (maximum - minimum)) * 100}%`,
            marginLeft: -8,
          }}
        />
      </View>
    </View>
  );
}

function DebugLayerToggle({
  kind,
  value,
  onValueChange,
}: {
  kind: DebugLayerKind;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Text className="flex-1 text-sm text-fg">{debugLayerLabels[kind]}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function gridPaths(
  geometry: ShapeContextGrade,
  transformed: boolean,
): string[] {
  const coordinates = Array.from(
    { length: 7 },
    (_, index) => -1.5 + index * 0.5,
  );
  const paths: string[] = [];
  for (const coordinate of coordinates) {
    for (const vertical of [false, true]) {
      const points = Array.from({ length: 17 }, (_, index) => {
        const position = -1.5 + (index * 3) / 16;
        const point = vertical
          ? { x: coordinate, y: position }
          : { x: position, y: coordinate };
        return transformed ? geometry.transform.transform(point) : point;
      });
      paths.push(pathFromPoints(points.map(canvasPoint)));
    }
  }
  return paths;
}

function debugViewBox(
  geometry: ShapeContextGrade,
  layers: Record<DebugLayerKind, boolean>,
): string {
  const points = [
    ...geometry.sourcePoints,
    ...geometry.targetPoints,
    ...geometry.transformedPoints,
  ];
  if (layers.sourceGrid || layers.registeredGrid) {
    const coordinates = Array.from(
      { length: 7 },
      (_, index) => -1.5 + index * 0.5,
    );
    for (const coordinate of coordinates) {
      for (let index = 0; index < 17; index++) {
        const position = -1.5 + (index * 3) / 16;
        for (const vertical of [false, true]) {
          const point = vertical
            ? { x: coordinate, y: position }
            : { x: position, y: coordinate };
          if (layers.sourceGrid) {
            points.push(point);
          }
          if (layers.registeredGrid) {
            points.push(geometry.transform.transform(point));
          }
        }
      }
    }
  }
  const canvasPoints = points.map(canvasPoint);
  const minX = Math.min(...canvasPoints.map(({ x }) => x));
  const maxX = Math.max(...canvasPoints.map(({ x }) => x));
  const minY = Math.min(...canvasPoints.map(({ y }) => y));
  const maxY = Math.max(...canvasPoints.map(({ y }) => y));
  const size = Math.max(maxX - minX, maxY - minY) + 40;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return `${centerX - size / 2} ${centerY - size / 2} ${size} ${size}`;
}

export function HanziWritingDebug({
  geometry,
  drawnStrokes,
  referencePaths,
  onGeometryChange,
}: {
  geometry: ShapeContextGrade;
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
  referencePaths: readonly string[];
  onGeometryChange: (geometry: ShapeContextGrade) => void;
}) {
  const [options, setOptions] = useState(geometry.options);
  const [layers, setLayers] = useState<Record<DebugLayerKind, boolean>>({
    source: true,
    target: true,
    registered: true,
    correspondences: true,
    sourceGrid: false,
    registeredGrid: false,
    residual: true,
    deformation: false,
  });

  function changeOption(key: keyof ShapeContextOptions, value: number) {
    const next = { ...options, [key]: value };
    setOptions(next);
  }

  function rerun(key: keyof ShapeContextOptions, value: number) {
    const next = { ...options, [key]: value };
    setOptions(next);
    onGeometryChange(gradeCharacterShape(drawnStrokes, referencePaths, next));
  }

  function rerunOptions(next: ShapeContextOptions) {
    setOptions(next);
    onGeometryChange(gradeCharacterShape(drawnStrokes, referencePaths, next));
  }

  function toggleLayer(kind: DebugLayerKind, value: boolean) {
    setLayers((current) => ({ ...current, [kind]: value }));
  }

  const normalizedSourceStrokes = geometry.sourceStrokes.map((stroke) =>
    stroke.map(canvasPoint),
  );
  const normalizedTargetStrokes = geometry.targetStrokes.map((stroke) =>
    stroke.map(canvasPoint),
  );
  const registeredStrokes = geometry.sourceStrokes.map((stroke) =>
    stroke.map((point) => canvasPoint(geometry.transform.transform(point))),
  );
  const matchedBySource = new Map(
    geometry.correspondences.map((correspondence) => [
      correspondence.sourceIndex,
      correspondence,
    ]),
  );
  const unmatchedSources = new Set(geometry.unmatchedSourceIndices);
  const unmatchedTargets = new Set(geometry.unmatchedTargetIndices);

  return (
    <View>
      <View className="gap-3 rounded-lg border border-border p-3">
        <Text className="text-lg font-semibold text-fg">
          Shape Context + TPS debug
        </Text>
        <View className="w-full items-center" style={{ aspectRatio: 1 }}>
          <Svg
            width="100%"
            height="100%"
            viewBox={debugViewBox(geometry, layers)}
          >
            {layers.sourceGrid
              ? gridPaths(geometry, false).map((path, index) => (
                  <SvgPath
                    key={`source-grid:${index}`}
                    d={path}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                  />
                ))
              : null}
            {layers.registeredGrid
              ? gridPaths(geometry, true).map((path, index) => (
                  <SvgPath
                    key={`registered-grid:${index}`}
                    d={path}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth={2}
                  />
                ))
              : null}
            {layers.source
              ? normalizedSourceStrokes.map((stroke, index) => (
                  <SvgPath
                    key={`source:${index}`}
                    d={pathFromPoints(stroke)}
                    fill="none"
                    stroke="#19aaf5"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))
              : null}
            {layers.target
              ? normalizedTargetStrokes.map((stroke, index) => (
                  <SvgPath
                    key={`target:${index}`}
                    d={pathFromPoints(stroke)}
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))
              : null}
            {layers.registered
              ? registeredStrokes.map((stroke, index) => (
                  <SvgPath
                    key={`registered:${index}`}
                    d={pathFromPoints(stroke)}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))
              : null}
            {layers.deformation
              ? geometry.sourcePoints.map((point, index) => {
                  const transformed = geometry.transformedPoints[index];
                  if (transformed == null) {
                    return null;
                  }
                  const start = canvasPoint(point);
                  const end = canvasPoint(transformed);
                  return (
                    <Line
                      key={`deformation:${index}`}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke="#d946ef"
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  );
                })
              : null}
            {layers.correspondences
              ? geometry.correspondences.map((correspondence) => {
                  const source =
                    geometry.transformedPoints[correspondence.sourceIndex];
                  const target =
                    geometry.targetPoints[correspondence.targetIndex];
                  if (source == null || target == null) {
                    return null;
                  }
                  const start = canvasPoint(source);
                  const end = canvasPoint(target);
                  return (
                    <Line
                      key={`correspondence:${correspondence.sourceIndex}`}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke="#111827"
                      strokeWidth={2}
                      opacity={0.35}
                    />
                  );
                })
              : null}
            {layers.residual
              ? geometry.sourcePoints.map((_, index) => {
                  const transformed = geometry.transformedPoints[index];
                  if (transformed == null) {
                    return null;
                  }
                  const correspondence = matchedBySource.get(index);
                  const residual =
                    correspondence?.residualDistance ??
                    Math.min(
                      ...geometry.targetPoints.map((point) =>
                        Math.hypot(
                          transformed.x - point.x,
                          transformed.y - point.y,
                        ),
                      ),
                    );
                  const point = canvasPoint(transformed);
                  return (
                    <Circle
                      key={`residual:${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={7}
                      fill={residualColor(residual)}
                    />
                  );
                })
              : null}
            {layers.correspondences
              ? geometry.sourcePoints.map((point, index) => {
                  const location = canvasPoint(
                    geometry.transformedPoints[index] ?? point,
                  );
                  return (
                    <Circle
                      key={`source-point:${index}`}
                      cx={location.x}
                      cy={location.y}
                      r={4}
                      fill={unmatchedSources.has(index) ? `#f97316` : `#2563eb`}
                    />
                  );
                })
              : null}
            {layers.correspondences
              ? geometry.targetPoints.map((point, index) => {
                  const location = canvasPoint(point);
                  return (
                    <Circle
                      key={`target-point:${index}`}
                      cx={location.x}
                      cy={location.y}
                      r={4}
                      fill={unmatchedTargets.has(index) ? `#ef4444` : `#16a34a`}
                    />
                  );
                })
              : null}
          </Svg>
        </View>
        <View className="gap-2">
          {(Object.keys(debugLayerLabels) as DebugLayerKind[]).map((kind) => (
            <DebugLayerToggle
              key={kind}
              kind={kind}
              value={layers[kind]}
              onValueChange={(value) => {
                toggleLayer(kind, value);
              }}
            />
          ))}
        </View>
        <View className="gap-1">
          <Text className="text-sm text-fg">
            Similarity score (not a probability):{` `}
            {geometry.similarity.toFixed(3)}
          </Text>
          <Text className="text-sm text-fg">
            Shape threshold only:{` `}
            {geometry.similarity >= hanziCharacterWritingSimilarityThreshold
              ? `passed`
              : `below the prototype threshold`}
          </Text>
          <Text className="text-sm text-fg">
            Initial matching error: {geometry.initialMatchingError.toFixed(3)}
          </Text>
          <Text className="text-sm text-fg">
            Residual matching error: {geometry.residualMatchingError.toFixed(3)}
          </Text>
          <Text className="text-sm text-fg">
            Reference length: {geometry.referenceLength.toFixed(3)} · sample
            count: {geometry.sampleCount}
          </Text>
          <Text className="text-sm text-fg">
            Points per stroke (source):{` `}
            {geometry.sourceStrokeSampleCounts.join(`, `)}
          </Text>
          <Text className="text-sm text-fg">
            Points per stroke (reference):{` `}
            {geometry.targetStrokeSampleCounts.join(`, `)}
          </Text>
          <Text className="text-sm text-fg">
            TPS bending energy: {geometry.bendingEnergy.toFixed(4)}
          </Text>
          <Text className="text-sm text-fg">
            Affine distortion: {geometry.affineDistortion.toFixed(3)}
          </Text>
          <Text className="text-sm text-fg">
            Estimated rotation: {geometry.rotationDegrees.toFixed(1)}° (penalty
            {` `}
            {geometry.rotationPenalty.toFixed(3)})
          </Text>
          <Text className="text-sm text-fg">
            Unmatched-point penalty: {geometry.unmatchedPointPenalty.toFixed(3)}
          </Text>
          <Text className="text-sm text-fg">
            Geometry coverage penalty:{` `}
            {geometry.geometryCoveragePenalty.toFixed(3)}
          </Text>
          <Text className="text-sm text-fg">
            Coverage distance tolerance:{` `}
            {geometry.geometryCoverageTolerance.toFixed(3)} normalized units
          </Text>
          <Text className="text-sm text-fg">
            Uncovered geometry before TPS (reference / handwriting):{` `}
            {(
              geometry.initialGeometryCoverage.referenceToHandwriting * 100
            ).toFixed(1)}
            % /{` `}
            {(
              geometry.initialGeometryCoverage.handwritingToReference * 100
            ).toFixed(1)}
            %
          </Text>
          <Text className="text-sm text-fg">
            Uncovered geometry after TPS (reference / handwriting):{` `}
            {(
              geometry.residualGeometryCoverage.referenceToHandwriting * 100
            ).toFixed(1)}
            % /{` `}
            {(
              geometry.residualGeometryCoverage.handwritingToReference * 100
            ).toFixed(1)}
            %
          </Text>
          <Text className="text-sm text-fg">
            Longest uncovered run before TPS (reference / handwriting):{` `}
            {(
              geometry.initialGeometryCoverage.referenceLongestUncoveredRun *
              100
            ).toFixed(1)}
            % /{` `}
            {(
              geometry.initialGeometryCoverage.handwritingLongestUncoveredRun *
              100
            ).toFixed(1)}
            %
          </Text>
          <Text className="text-sm text-fg">
            Longest uncovered run after TPS (reference / handwriting):{` `}
            {(
              geometry.residualGeometryCoverage.referenceLongestUncoveredRun *
              100
            ).toFixed(1)}
            % /{` `}
            {(
              geometry.residualGeometryCoverage.handwritingLongestUncoveredRun *
              100
            ).toFixed(1)}
            %
          </Text>
          <Text className="text-sm text-fg">
            Matched points: {geometry.correspondences.length}; unmatched:{` `}
            {geometry.unmatchedSourceIndices.length} handwritten /{` `}
            {geometry.unmatchedTargetIndices.length} reference
          </Text>
        </View>
        <View className="gap-2 border-t border-border pt-2">
          <Text className="font-semibold text-fg">Algorithm parameters</Text>
          <Slider
            label="TPS regularization"
            minimum={0.01}
            maximum={0.5}
            step={0.01}
            value={options.tpsRegularization}
            formatValue={(value) => value.toFixed(2)}
            onValueChange={(value) => {
              changeOption(`tpsRegularization`, value);
            }}
            onValueChangeComplete={(value) => {
              rerun(`tpsRegularization`, value);
            }}
          />
          <View className="gap-2">
            <Text className="font-semibold text-fg">Sampling</Text>
            <ButtonGroup>
              <ButtonGroup.Button
                variant={options.sampleCount == null ? `filled` : `outline`}
                onPress={() => {
                  rerunOptions({ ...options, sampleCount: null });
                }}
              >
                Automatic
              </ButtonGroup.Button>
              <ButtonGroup.Button
                variant={options.sampleCount == null ? `outline` : `filled`}
                onPress={() => {
                  rerunOptions({
                    ...options,
                    sampleCount: geometry.sampleCount,
                  });
                }}
              >
                Manual
              </ButtonGroup.Button>
            </ButtonGroup>
            {options.sampleCount == null ? (
              <Slider
                label="Target spacing"
                minimum={0.02}
                maximum={0.2}
                step={0.005}
                value={options.sampleSpacing}
                formatValue={(value) => value.toFixed(3)}
                onValueChange={(value) => {
                  changeOption(`sampleSpacing`, value);
                }}
                onValueChangeComplete={(value) => {
                  rerun(`sampleSpacing`, value);
                }}
              />
            ) : (
              <Slider
                label="Sample count override"
                minimum={8}
                maximum={256}
                step={8}
                value={options.sampleCount}
                formatValue={(value) => `${value}`}
                onValueChange={(value) => {
                  changeOption(`sampleCount`, value);
                }}
                onValueChangeComplete={(value) => {
                  rerun(`sampleCount`, value);
                }}
              />
            )}
          </View>
          <Slider
            label="Log-radius bins"
            minimum={3}
            maximum={8}
            step={1}
            value={options.radialBins}
            formatValue={(value) => `${value}`}
            onValueChange={(value) => {
              changeOption(`radialBins`, value);
            }}
            onValueChangeComplete={(value) => {
              rerun(`radialBins`, value);
            }}
          />
          <Slider
            label="Angular bins"
            minimum={4}
            maximum={24}
            step={4}
            value={options.angularBins}
            formatValue={(value) => `${value}`}
            onValueChange={(value) => {
              changeOption(`angularBins`, value);
            }}
            onValueChangeComplete={(value) => {
              rerun(`angularBins`, value);
            }}
          />
          <Slider
            label="Unmatched-point cost"
            minimum={0.15}
            maximum={1}
            step={0.05}
            value={options.unmatchedCost}
            formatValue={(value) => value.toFixed(2)}
            onValueChange={(value) => {
              changeOption(`unmatchedCost`, value);
            }}
            onValueChangeComplete={(value) => {
              rerun(`unmatchedCost`, value);
            }}
          />
          <Text className="text-xs text-muted-fg">
            Residual colors show match error (green to red); purple vectors show
            deformation magnitude separately.
          </Text>
        </View>
      </View>
    </View>
  );
}
