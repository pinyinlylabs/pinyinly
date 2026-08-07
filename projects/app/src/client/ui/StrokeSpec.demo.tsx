import { ExampleStack } from "@/client/ui/demo/components";
import { RectButton } from "@/client/ui/RectButton";
import {
  buildClosedSvgSegmentPathFromStrokeSpec,
  getSvgPathIntersections,
} from "@/util/strokeSpecSvgProcessor";
import { parseStrokeSpec } from "@/util/strokeSpec";
import { useEffect, useRef, useState } from "react";
import { Platform, Switch, Text, TextInput, View } from "react-native";

interface Example {
  title: string;
  svgFieldText: string;
  cutterPaths: readonly string[];
  strokeSpec: string;
  viewBox: readonly [number, number, number, number];
}

interface DrawPoint {
  x: number;
  y: number;
}

interface ParsedSvgFieldData {
  strokes: string[];
  medians: string[];
}

function buildSvgFieldText(data: {
  strokes: readonly string[];
  medians?: readonly string[];
}): string {
  return JSON.stringify(data, null, 2);
}

const electricStrokePaths = [
  `M 272 553 Q 244 569 214 577 Q 207 578 201 573 Q 192 566 203 554 Q 255 473 269 285 Q 270 222 312 187 Q 315 186 319 183 Q 338 177 339 213 Q 339 217 339 221 L 335 256 Q 308 376 296 514 C 294 541 294 541 272 553 Z`,
  `M 614 250 Q 633 220 652 212 Q 665 202 683 228 Q 705 267 745 475 Q 755 512 783 542 Q 799 557 785 574 Q 766 593 716 625 Q 695 634 610 614 Q 603 614 498 594 L 445 585 Q 424 582 405 578 Q 332 563 272 553 C 242 548 267 505 296 514 Q 295 515 298 515 Q 356 533 445 548 L 496 557 Q 548 567 612 576 Q 657 583 671 567 Q 690 545 686 521 Q 647 301 624 286 C 609 260 608 259 614 250 Z`,
  `M 491 397 Q 543 406 589 411 Q 614 414 605 428 Q 595 444 568 449 Q 526 456 492 440 L 443 428 Q 389 418 344 406 Q 326 402 347 386 Q 359 377 442 390 L 491 397 Z`,
  `M 490 240 Q 544 247 614 250 C 644 251 646 266 624 286 Q 621 290 616 293 Q 600 302 490 280 L 437 270 Q 383 263 335 256 C 305 252 309 221 339 221 Q 346 220 358 222 Q 389 229 437 234 L 490 240 Z`,
  `M 942 61 Q 921 119 913 220 Q 912 236 905 244 Q 898 251 892 235 Q 877 175 861 130 Q 854 99 825 81 Q 791 44 630 46 Q 569 52 545 64 Q 526 77 513 101 Q 494 141 490 240 L 490 280 Q 490 344 491 397 L 492 440 Q 493 506 496 557 L 498 594 Q 504 682 515 724 Q 522 746 492 769 Q 467 785 445 797 Q 426 810 408 798 Q 396 792 418 763 Q 443 729 444 680 Q 445 647 445 585 L 445 548 Q 444 496 443 428 L 442 390 Q 441 368 441 344 Q 438 304 437 270 L 437 234 Q 437 101 490 40 Q 544 -21 756 -10 Q 850 -6 920 27 Q 953 36 942 61 Z`,
] as const;

const electricMedianPaths = [
  `M 209 564 L 250 530 L 264 503 L 301 265 L 324 195`,
  `M 280 549 L 305 538 L 625 599 L 666 600 L 703 588 L 732 556 L 710 476 L 688 359 L 655 254 L 660 224`,
  `M 345 396 L 404 401 L 531 428 L 571 429 L 594 422`,
  `M 343 227 L 355 240 L 373 244 L 596 273 L 614 282`,
  `M 416 788 L 449 765 L 476 728 L 463 224 L 476 126 L 489 89 L 507 62 L 540 37 L 620 19 L 743 19 L 837 40 L 886 68 L 901 235`,
] as const;

const examples: readonly Example[] = [
  {
    title: `line cut`,
    svgFieldText: buildSvgFieldText({
      strokes: [`M 40 140 L 260 140`, `M 80 20 L 80 260`, `M 220 20 L 220 260`],
      medians: [`M 40 140 L 260 140`],
    }),
    cutterPaths: [],
    strokeSpec: `0[1:2]`,
    viewBox: [0, 0, 300, 300],
  },
  {
    title: `电`,
    svgFieldText: buildSvgFieldText({
      strokes: electricStrokePaths,
      medians: electricMedianPaths,
    }),
    cutterPaths: [],
    strokeSpec: `4[1:3]`,
    viewBox: [0, 0, 1024, 1024],
  },
] as const;

const calculationDebounceMs = 150;

function pathFromPoints(points: readonly DrawPoint[]): string {
  return points
    .map((point, index) =>
      index === 0
        ? `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        : `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(` `);
}

function distanceBetweenPoints(a: DrawPoint, b: DrawPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function parsePathStartPoint(path: string): DrawPoint | null {
  const match = /M\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)/u.exec(path);
  if (match == null) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    return null;
  }

  return { x, y };
}

function parseSvgFieldData(svgFieldText: string): ParsedSvgFieldData {
  const trimmed = svgFieldText.trim().replace(/,\s*$/u, ``);
  if (trimmed.length === 0) {
    return {
      strokes: [],
      medians: [],
    };
  }

  let candidate = trimmed;
  if (!candidate.startsWith(`{`)) {
    candidate = `{${candidate}}`;
  }

  const parsed = JSON.parse(candidate) as unknown;
  const asRecord =
    typeof parsed === `object` && parsed != null
      ? (parsed as Record<string, unknown>)
      : null;

  const svgRecord =
    asRecord != null &&
    typeof asRecord[`svg`] === `object` &&
    asRecord[`svg`] != null
      ? (asRecord[`svg`] as Record<string, unknown>)
      : asRecord;

  if (svgRecord == null) {
    throw new Error(`SVG field must be a JSON object.`);
  }

  const strokesValue = svgRecord[`strokes`];
  if (!Array.isArray(strokesValue)) {
    throw new TypeError(`SVG field must include a strokes array.`);
  }

  const strokes = strokesValue.map((value, index) => {
    if (typeof value !== `string`) {
      throw new TypeError(`strokes[${index}] must be a string path.`);
    }
    return value;
  });

  const mediansValue = svgRecord[`medians`];
  const medians = strokes.map((stroke, index) => {
    if (!Array.isArray(mediansValue)) {
      return stroke;
    }

    // oxlint-disable-next-line typescript/no-unsafe-assignment
    const median = mediansValue[index];
    return typeof median === `string` ? median : stroke;
  });

  return {
    strokes,
    medians,
  };
}

function inferPrimaryTargetStrokeId(strokeSpecText: string): number | null {
  const spec = parseStrokeSpec(strokeSpecText);

  for (const item of spec) {
    for (const atom of item) {
      if (atom.kind === `slice`) {
        return atom.stroke;
      }

      // oxlint-disable-next-line typescript/no-unnecessary-condition
      if (atom.kind === `range`) {
        if (atom.start === atom.end) {
          return atom.start;
        }
        return atom.start;
      }
    }
  }

  return null;
}

export default function StrokeSegmentsDebugDemo() {
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const selectedExample = examples[selectedExampleIndex] ?? examples[0]!;

  const [svgFieldText, setSvgFieldText] = useState(
    selectedExample.svgFieldText,
  );
  const [cutterPaths, setCutterPaths] = useState<string[]>([
    ...selectedExample.cutterPaths,
  ]);
  const [activeCutterPath, setActiveCutterPath] = useState(``);
  const [strokeSpec, setStrokeSpec] = useState(selectedExample.strokeSpec);
  const [debouncedSvgFieldText, setDebouncedSvgFieldText] = useState(
    selectedExample.svgFieldText,
  );
  const [debouncedCutterPaths, setDebouncedCutterPaths] = useState<string[]>([
    ...selectedExample.cutterPaths,
  ]);
  const [debouncedStrokeSpec, setDebouncedStrokeSpec] = useState(
    selectedExample.strokeSpec,
  );
  const [showIntersections, setShowIntersections] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<DrawPoint[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSvgFieldText(svgFieldText);
    }, calculationDebounceMs);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [svgFieldText]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedCutterPaths([...cutterPaths]);
    }, calculationDebounceMs);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [cutterPaths]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedStrokeSpec(strokeSpec);
    }, calculationDebounceMs);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [strokeSpec]);

  if (Platform.OS !== `web`) {
    return (
      <View className="gap-2">
        <Text className="pyly-body">This debugger demo is web-only.</Text>
      </View>
    );
  }

  let svgFieldError: string | null = null;
  let strokeSpecError: string | null = null;
  let segmentPath: string | null = null;

  let parsedSvgData: ParsedSvgFieldData = { strokes: [], medians: [] };

  try {
    parsedSvgData = parseSvgFieldData(debouncedSvgFieldText);
  } catch (error) {
    svgFieldError =
      error instanceof Error ? error.message : `Invalid SVG field data.`;
  }

  const baseStrokeCount = parsedSvgData.strokes.length;
  const strokePathsById: Record<number, string> = {
    ...Object.fromEntries(
      parsedSvgData.strokes.map((path, index) => [index, path]),
    ),
    ...Object.fromEntries(
      debouncedCutterPaths.map((path, index) => [
        baseStrokeCount + index,
        path,
      ]),
    ),
  };
  const medianPathsById: Record<number, string> = Object.fromEntries(
    parsedSvgData.medians.map((path, index) => [index, path]),
  );

  if (svgFieldError == null && parsedSvgData.strokes.length > 0) {
    try {
      segmentPath = buildClosedSvgSegmentPathFromStrokeSpec({
        strokePathsById,
        medianPathsById,
        strokeSpecText: debouncedStrokeSpec,
      });
    } catch (error) {
      strokeSpecError =
        error instanceof Error ? error.message : `Invalid stroke spec.`;
    }
  }

  let targetStrokeId: number | null = null;
  try {
    targetStrokeId = inferPrimaryTargetStrokeId(debouncedStrokeSpec);
  } catch {
    targetStrokeId = null;
  }

  const targetPath =
    targetStrokeId == null ? null : (strokePathsById[targetStrokeId] ?? null);
  const targetMedianPath =
    targetStrokeId == null
      ? null
      : (medianPathsById[targetStrokeId] ?? targetPath);

  const pathEntries = Object.entries(strokePathsById)
    .map(([idText, path]) => ({
      id: Number(idText),
      path,
    }))
    .sort((left, right) => left.id - right.id);

  const outlineIntersections =
    targetPath == null
      ? []
      : pathEntries
          .filter((entry) => entry.id !== targetStrokeId)
          .flatMap((entry) =>
            getSvgPathIntersections(targetPath, entry.path).map(
              (intersection, occurrence) => ({
                pathId: entry.id,
                occurrence,
                ...intersection,
              }),
            ),
          );

  const medianIntersections =
    targetMedianPath == null
      ? []
      : pathEntries
          .filter((entry) => entry.id !== targetStrokeId)
          .flatMap((entry) =>
            getSvgPathIntersections(targetMedianPath, entry.path).map(
              (intersection, occurrence) => ({
                pathId: entry.id,
                occurrence,
                ...intersection,
              }),
            ),
          );

  function loadExample(index: number) {
    const example = examples[index];
    if (example == null) {
      return;
    }

    setSelectedExampleIndex(index);
    setSvgFieldText(example.svgFieldText);
    setDebouncedSvgFieldText(example.svgFieldText);
    setCutterPaths([...example.cutterPaths]);
    setDebouncedCutterPaths([...example.cutterPaths]);
    setActiveCutterPath(``);
    setStrokeSpec(example.strokeSpec);
    setDebouncedStrokeSpec(example.strokeSpec);
  }

  function clientPointToSvgPoint(
    clientX: number,
    clientY: number,
  ): DrawPoint | null {
    const svg = svgRef.current;
    if (svg == null) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    const [minX, minY, width, height] = selectedExample.viewBox;
    return {
      x: minX + ((clientX - rect.left) / rect.width) * width,
      y: minY + ((clientY - rect.top) / rect.height) * height,
    };
  }

  function pushPoint(point: DrawPoint) {
    const previousPoint = drawPointsRef.current.at(-1);
    if (
      previousPoint != null &&
      distanceBetweenPoints(previousPoint, point) < 3
    ) {
      return;
    }

    drawPointsRef.current = [...drawPointsRef.current, point];
    setActiveCutterPath(pathFromPoints(drawPointsRef.current));
    forceRender((value) => value + 1);
  }

  return (
    <View className="w-full max-w-[1200px] gap-4">
      <View className="flex-row flex-wrap gap-2">
        {examples.map((example, index) => (
          <RectButton
            key={example.title}
            variant={index === selectedExampleIndex ? `filled` : `outline`}
            onPress={() => {
              loadExample(index);
            }}
          >
            {example.title}
          </RectButton>
        ))}
        <RectButton
          variant="outline"
          onPress={() => {
            drawPointsRef.current = [];
            setCutterPaths([]);
            setDebouncedCutterPaths([]);
            setActiveCutterPath(``);
            forceRender((value) => value + 1);
          }}
        >
          clear cutters
        </RectButton>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <ExampleStack title="canvas" childrenClassName="w-full" showFrame>
          <View className="w-[560px] gap-2">
            <svg
              ref={svgRef}
              viewBox={selectedExample.viewBox.join(` `)}
              className="size-[560px] touch-none bg-white"
            >
              <rect
                x={selectedExample.viewBox[0]}
                y={selectedExample.viewBox[1]}
                width={selectedExample.viewBox[2]}
                height={selectedExample.viewBox[3]}
                fill="#ffffff"
                stroke="#d9d9d9"
              />

              {pathEntries
                .filter((entry) => entry.id < baseStrokeCount)
                .map((entry) => (
                  <path
                    key={`stroke:${entry.id}`}
                    d={entry.path}
                    fill="none"
                    stroke="#111111"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

              {Object.entries(medianPathsById)
                .map(([idText, path]) => ({
                  id: Number(idText),
                  path,
                }))
                .filter((entry) => entry.id < baseStrokeCount)
                .sort((left, right) => left.id - right.id)
                .map((entry) => {
                  const isTarget = entry.id === targetStrokeId;

                  return (
                    <path
                      key={`median:${entry.id}`}
                      d={entry.path}
                      fill="none"
                      stroke={isTarget ? `#a16207` : `#b45309`}
                      strokeDasharray={isTarget ? `10 8` : `6 6`}
                      strokeOpacity={isTarget ? 1 : 0.55}
                      strokeWidth={isTarget ? 2.5 : 1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

              {segmentPath == null ? null : (
                <path
                  d={segmentPath}
                  fill="#ef4444"
                  fillOpacity={0.35}
                  stroke="#ef4444"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              )}

              {pathEntries
                .filter((entry) => entry.id >= baseStrokeCount)
                .map((entry) => (
                  <path
                    key={`cutter:${entry.id}`}
                    d={entry.path}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

              {activeCutterPath.trim().length === 0 ? null : (
                <path
                  d={activeCutterPath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {pathEntries.map((entry) => {
                const start = parsePathStartPoint(entry.path);
                if (start == null) {
                  return null;
                }

                const isBaseStroke = entry.id < baseStrokeCount;
                return (
                  <text
                    key={`label:${entry.id}`}
                    x={start.x + 8}
                    y={start.y - 10}
                    fill={isBaseStroke ? `#111827` : `#1d4ed8`}
                    fontSize={12}
                    fontWeight="700"
                  >
                    {entry.id}
                  </text>
                );
              })}

              {showIntersections
                ? outlineIntersections.map((intersection, index) => (
                    <g key={`${intersection.x}:${intersection.y}:${index}`}>
                      <circle
                        cx={intersection.x}
                        cy={intersection.y}
                        r={6}
                        fill="#16a34a"
                      />
                      {showLabels ? (
                        <text
                          x={intersection.x + 8}
                          y={intersection.y - 8}
                          fill="#166534"
                          fontSize={12}
                        >
                          {intersection.pathId}#{intersection.occurrence}
                        </text>
                      ) : null}
                    </g>
                  ))
                : null}

              {showIntersections
                ? medianIntersections.map((intersection, index) => (
                    <g
                      key={`median:${intersection.x}:${intersection.y}:${index}`}
                    >
                      <circle
                        cx={intersection.x}
                        cy={intersection.y}
                        r={4}
                        fill="#7c3aed"
                      />
                      {showLabels ? (
                        <text
                          x={intersection.x + 8}
                          y={intersection.y + 14}
                          fill="#6d28d9"
                          fontSize={12}
                        >
                          m {intersection.pathId}#{intersection.occurrence}
                        </text>
                      ) : null}
                    </g>
                  ))
                : null}

              <rect
                x={selectedExample.viewBox[0]}
                y={selectedExample.viewBox[1]}
                width={selectedExample.viewBox[2]}
                height={selectedExample.viewBox[3]}
                fill="transparent"
                onPointerDown={(event) => {
                  isDrawingRef.current = true;
                  drawPointsRef.current = [];
                  setActiveCutterPath(``);
                  const point = clientPointToSvgPoint(
                    event.clientX,
                    event.clientY,
                  );
                  if (point != null) {
                    pushPoint(point);
                  }
                }}
                onPointerMove={(event) => {
                  if (!isDrawingRef.current) {
                    return;
                  }
                  const point = clientPointToSvgPoint(
                    event.clientX,
                    event.clientY,
                  );
                  if (point != null) {
                    pushPoint(point);
                  }
                }}
                onPointerUp={() => {
                  isDrawingRef.current = false;
                  if (drawPointsRef.current.length >= 2) {
                    const nextPath = pathFromPoints(drawPointsRef.current);
                    if (nextPath.trim().length > 0) {
                      setCutterPaths((previous) => [...previous, nextPath]);
                    }
                  }
                  drawPointsRef.current = [];
                  setActiveCutterPath(``);
                }}
                onPointerLeave={() => {
                  isDrawingRef.current = false;
                  if (drawPointsRef.current.length >= 2) {
                    const nextPath = pathFromPoints(drawPointsRef.current);
                    if (nextPath.trim().length > 0) {
                      setCutterPaths((previous) => [...previous, nextPath]);
                    }
                  }
                  drawPointsRef.current = [];
                  setActiveCutterPath(``);
                }}
              />
            </svg>
            <Text className="font-sans text-[12px] text-fg-dim">
              Paste SVG field data (`strokes` + optional `medians`). Stroke IDs
              are array indexes. Drawn cutter paths are appended after the last
              stroke ID.
            </Text>
          </View>
        </ExampleStack>

        <ExampleStack title="controls" childrenClassName="w-[520px] gap-3">
          <View className="gap-2">
            <Text className="text-left pyly-dev-dt">
              svg field data (from character.json)
            </Text>
            <TextInput
              value={svgFieldText}
              multiline
              onChangeText={setSvgFieldText}
              className="
                min-h-52 rounded-xl bg-bg-high px-4 py-3 font-mono text-[12px] text-fg outline-none
              "
            />
            <Text className="font-sans text-[12px] text-fg-dim">
              Paste either {`{"strokes":[...],"medians":[...]}`} or the raw
              field body.
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-left pyly-dev-dt">
              extra cutter paths (one per line, auto-assigned IDs)
            </Text>
            <TextInput
              value={cutterPaths.join(`\n`)}
              multiline
              onChangeText={(value) => {
                const nextPaths = value
                  .split(/\r?\n/u)
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0);
                setCutterPaths(nextPaths);
              }}
              className="
                min-h-24 rounded-xl bg-bg-high px-4 py-3 font-mono text-[12px] text-fg outline-none
              "
            />
          </View>

          <View className="gap-2">
            <Text className="text-left pyly-dev-dt">stroke spec</Text>
            <TextInput
              value={strokeSpec}
              onChangeText={setStrokeSpec}
              multiline
              className="
                min-h-20 rounded-xl bg-bg-high px-4 py-3 font-mono text-[12px] text-fg outline-none
              "
            />
            <Text className="font-sans text-[12px] text-fg-dim">
              Example: 4[1:2], 4[:1], 4[1:], or 4.
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="pyly-body">show intersections</Text>
            <Switch
              value={showIntersections}
              onValueChange={setShowIntersections}
            />
            <Text className="pyly-body">show labels</Text>
            <Switch value={showLabels} onValueChange={setShowLabels} />
          </View>

          <View className="gap-2 rounded-xl bg-bg-high p-3">
            <Text className="text-left pyly-dev-dt">status</Text>
            <Text className="font-mono text-[12px] text-fg-dim">
              {
                // oxlint-disable-next-line no-negated-condition
                svgFieldError != null
                  ? `svg error: ${svgFieldError}`
                  : // oxlint-disable-next-line no-negated-condition
                    strokeSpecError != null
                    ? `spec error: ${strokeSpecError}`
                    : svgFieldText !== debouncedSvgFieldText ||
                        cutterPaths.join(`\n`) !==
                          debouncedCutterPaths.join(`\n`) ||
                        strokeSpec !== debouncedStrokeSpec
                      ? `calculating...`
                      : `ok`
              }
            </Text>
          </View>

          <View className="gap-2 rounded-xl bg-bg-high p-3">
            <Text className="text-left pyly-dev-dt">computed closed cut</Text>
            <Text className="font-mono text-[12px] text-fg-dim">
              {segmentPath ?? `null`}
            </Text>
          </View>
        </ExampleStack>
      </View>
    </View>
  );
}
