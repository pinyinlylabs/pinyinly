import { G, Svg } from "react-native-svg";
import { SvgPath } from "./SvgPath";
import type { HanziStrokeColor } from "@/data/model";

export function HanziCharacter(props: {
  strokesData: string[];
  highlightStrokes: number[];
  highlightPaths?: readonly string[];
  highlightColor?: HanziStrokeColor | null;
  className?: string;
}) {
  const highlightedStrokes = new Set(props.highlightStrokes);
  const highlightedSegmentPaths = props.highlightPaths ?? [];

  return (
    <Svg
      viewBox="0 0 1024 1024"
      width="256"
      height="256"
      className={props.className ?? `size-8 shrink-0`}
    >
      <G transform="scale(1, -1) translate(0, -900)">
        {/* Placeholder */}
        {props.strokesData
          .filter((_, i) => !highlightedStrokes.has(i))
          .map((d, i) => (
            <SvgPath
              key={i}
              d={d}
              fillClassName="accent-fg-bg40"
              strokeClassName="accent-fg-bg40"
              strokeWidth={20}
            />
          ))}
        {/* Bold Outline */}
        {/* {props.strokesData
          .filter((_, i) => highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss
              key={i}
              d={d}
              className={outlineClass({ color: props.highlightColor })}
              strokeWidth={120}
            />
          ))} */}
        {/* Bold Fill */}
        {props.strokesData
          .filter((_, i) => highlightedStrokes.has(i))
          .map((d, i) => (
            <SvgPath
              key={i}
              d={d}
              fillClassName="accent-fg-loud"
              strokeClassName="accent-fg-loud"
              // Make the character appear a bit bolder by using a thicker stroke.
              strokeWidth={20}
            />
          ))}
        {highlightedSegmentPaths.map((d, i) => (
          <SvgPath
            key={`segment:${i}`}
            d={d}
            fillClassName="accent-fg-loud"
            strokeClassName="accent-fg-loud"
            strokeWidth={20}
          />
        ))}
      </G>
    </Svg>
  );
}
