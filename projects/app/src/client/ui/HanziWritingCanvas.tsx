import type { PointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import type { WritingStrokePoint } from "@/util/writingStrokeGrader";
import { View } from "@/client/ui/View";

function pathFromPoints(points: readonly WritingStrokePoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

export function HanziWritingCanvas({
  children,
  className = `aspect-square w-full`,
  disabled = false,
  onStrokeComplete,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onStrokeComplete: (points: WritingStrokePoint[]) => void;
}) {
  const [activePath, setActivePath] = useState(``);
  const pointsRef = useRef<WritingStrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  function getPoint(event: PointerEvent<SVGSVGElement>): WritingStrokePoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1024,
      y: ((event.clientY - rect.top) / rect.height) * 1024,
    };
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (disabled) {
      return;
    }

    isDrawingRef.current = true;
    pointsRef.current = [getPoint(event)];
    setActivePath(pathFromPoints(pointsRef.current));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    pointsRef.current = [...pointsRef.current, getPoint(event)];
    setActivePath(pathFromPoints(pointsRef.current));
  }

  function onPointerUp() {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    if (pointsRef.current.length > 1) {
      onStrokeComplete(pointsRef.current);
    }
    pointsRef.current = [];
    setActivePath(``);
  }

  function onPointerCancel() {
    isDrawingRef.current = false;
    pointsRef.current = [];
    setActivePath(``);
  }

  return (
    <View
      className={`
        ${className}

        overflow-hidden rounded-xl bg-bg
      `}
    >
      <svg
        viewBox="0 0 1024 1024"
        className="size-full touch-none text-fg-bg30"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {children}
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
    </View>
  );
}
