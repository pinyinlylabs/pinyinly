import type { PointerEvent } from "react";
import { useId, useRef, useState } from "react";
import {
  maxWritingPointCount,
  maxWritingStrokeCount,
} from "@/util/shapeContextGrader";
import type { WritingStrokePoint } from "@/util/shapeContextGrader";
import { ButtonGroup } from "@/client/ui/ButtonGroup";
import { View } from "@/client/ui/View";

function pathFromPoints(points: readonly WritingStrokePoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

function getPathStartPoint(path: string): WritingStrokePoint | null {
  const match =
    /^[Mm]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*[, ]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/u.exec(
      path,
    );
  if (match == null) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function HanziWritingCanvas({
  className = `aspect-square w-full`,
  disabled = false,
  hideGrid = false,
  guidedPaths,
  guidedPathIndex,
  drawnStrokes = [],
  gradeResult,
  onStrokeStart,
  onStrokesChange,
  onStrokeEnd,
}: {
  className?: string;
  disabled?: boolean;
  hideGrid?: boolean;
  guidedPaths?: readonly string[];
  guidedPathIndex?: number;
  drawnStrokes?: readonly (readonly WritingStrokePoint[])[];
  gradeResult?: `correct` | `incorrect` | null;
  onStrokeStart?: () => void;
  onStrokesChange: (strokes: WritingStrokePoint[][]) => void;
  onStrokeEnd?: () => void;
}) {
  const [activePath, setActivePath] = useState(``);
  const pointsRef = useRef<WritingStrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  const arrowMarkerId = `${useId()}-arrow`;
  const drawnPointCount = drawnStrokes.reduce(
    (total, stroke) => total + stroke.length,
    0,
  );
  const canUndo =
    !disabled &&
    guidedPathIndex == null &&
    (drawnStrokes.length > 0 || activePath.length > 0);
  const currentGuidedPath =
    guidedPathIndex == null ? null : guidedPaths?.[guidedPathIndex];
  const currentGuidedPathStart =
    currentGuidedPath == null ? null : getPathStartPoint(currentGuidedPath);

  function getPoint(event: PointerEvent<SVGSVGElement>): WritingStrokePoint {
    const rect = event.currentTarget.getBoundingClientRect();
    // Match the SVG's default centered, uniformly scaled viewBox.
    const size = Math.min(rect.width, rect.height);
    return {
      x: ((event.clientX - rect.left - (rect.width - size) / 2) / size) * 1024,
      y: ((event.clientY - rect.top - (rect.height - size) / 2) / size) * 1024,
    };
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (
      disabled ||
      drawnStrokes.length >= maxWritingStrokeCount ||
      drawnPointCount >= maxWritingPointCount
    ) {
      return;
    }

    isDrawingRef.current = true;
    onStrokeStart?.();
    pointsRef.current = [getPoint(event)];
    setActivePath(pathFromPoints(pointsRef.current));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (
      !isDrawingRef.current ||
      drawnPointCount + pointsRef.current.length >= maxWritingPointCount
    ) {
      return;
    }

    const point = getPoint(event);
    const previousPoint = pointsRef.current.at(-1);
    if (
      previousPoint != null &&
      Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) < 2
    ) {
      return;
    }

    pointsRef.current.push(point);
    setActivePath((path) => `${path} L ${point.x} ${point.y}`);
  }

  function onPointerUp() {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    if (pointsRef.current.length > 1) {
      onStrokesChange([
        ...drawnStrokes.map((stroke) => [...stroke]),
        [...pointsRef.current],
      ]);
    }
    onStrokeEnd?.();
    pointsRef.current = [];
    setActivePath(``);
  }

  function onPointerCancel() {
    isDrawingRef.current = false;
    onStrokeEnd?.();
    pointsRef.current = [];
    setActivePath(``);
  }

  function undoLastStroke() {
    if (canUndo) {
      if (activePath.length > 0) {
        isDrawingRef.current = false;
        pointsRef.current = [];
        setActivePath(``);
        onStrokeEnd?.();
        return;
      }

      const remainingStrokes = drawnStrokes.slice(0, -1);
      onStrokesChange(remainingStrokes.map((stroke) => [...stroke]));
    }
  }

  return (
    <View
      className={`
        relative

        ${className}

        overflow-hidden rounded-xl bg-bg
      `}
    >
      <svg
        viewBox="0 0 1024 1024"
        className="size-full touch-none text-fg-bg30 select-none [-webkit-touch-callout:none]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth="18"
            markerHeight="18"
            refX="9"
            refY="9"
            orient="auto"
            markerUnits="userSpaceOnUse"
            viewBox="0 0 18 18"
          >
            <path d="M 2 2 L 16 9 L 2 16 Z" fill="#19aaf5" />
          </marker>
        </defs>
        {hideGrid ? null : (
          <path
            d="M 512 512 V 24 M 512 512 V 1000 M 512 512 H 24 M 512 512 H 1000"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray="12 12"
            fill="none"
            pointerEvents="none"
          />
        )}
        {guidedPaths?.map((path, index) => (
          <path
            key={`guided:${index}`}
            d={path}
            fill="none"
            stroke="#e2e2e2"
            strokeWidth="48"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}
        {guidedPathIndex == null
          ? null
          : guidedPaths
              ?.slice(0, guidedPathIndex)
              .map((path, index) => (
                <path
                  key={`complete:${index}`}
                  d={path}
                  fill="none"
                  stroke="#19aaf5"
                  strokeWidth="24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ))}
        {currentGuidedPath == null ||
        guidedPathIndex == null ||
        guidedPathIndex >= (guidedPaths?.length ?? 0) ? null : (
          <>
            <path
              d={currentGuidedPath}
              fill="none"
              stroke="#19aaf5"
              strokeWidth="16"
              strokeDasharray="24 20"
              strokeLinecap="round"
              markerEnd={`url(#${arrowMarkerId})`}
              pointerEvents="none"
            />
            {currentGuidedPathStart == null ? null : (
              <g pointerEvents="none">
                <circle
                  cx={currentGuidedPathStart.x}
                  cy={currentGuidedPathStart.y}
                  r="48"
                  fill="#19aaf5"
                />
                <path
                  d={`M ${currentGuidedPathStart.x - 18} ${currentGuidedPathStart.y} H ${currentGuidedPathStart.x + 17} M ${currentGuidedPathStart.x + 1} ${currentGuidedPathStart.y - 17} L ${currentGuidedPathStart.x + 19} ${currentGuidedPathStart.y} L ${currentGuidedPathStart.x + 1} ${currentGuidedPathStart.y + 17}`}
                  fill="none"
                  stroke="white"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </>
        )}
        {drawnStrokes.map((stroke, index) => (
          <path
            key={`stroke:${index}`}
            d={pathFromPoints(stroke)}
            fill="none"
            stroke={gradeResult === `incorrect` ? `#ef4444` : `#19aaf5`}
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}
        {activePath.length === 0 ? null : (
          <path
            d={activePath}
            fill="none"
            stroke="#19aaf5"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}
        <rect
          x="0"
          y="0"
          width="1024"
          height="1024"
          fill="transparent"
          pointerEvents={disabled ? `none` : `all`}
        />
      </svg>
      {canUndo ? (
        <View
          data-testid="undo-button-container"
          className={`
            absolute top-3 right-3 opacity-100 transition-opacity delay-300 duration-200

            motion-reduce:transition-none motion-reduce:delay-0

            starting:pointer-events-none starting:opacity-0
          `}
        >
          <ButtonGroup>
            <ButtonGroup.Button
              variant="bareDim"
              iconStart="undo"
              onPress={undoLastStroke}
            >
              Undo
            </ButtonGroup.Button>
          </ButtonGroup>
        </View>
      ) : null}
    </View>
  );
}
