import { G, Svg } from "react-native-svg";
import type { HanziCharacterColor } from "./HanziCharacter.utils";
import { PathCss } from "./svg";

export function HanziCharacter(props: {
  strokesData: string[];
  highlightStrokes: number[];
  highlightPaths?: readonly string[];
  highlightColor?: HanziCharacterColor;
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
            <PathCss
              key={i}
              d={d}
              className="fill-fg-bg40 stroke-fg-bg40"
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
            <PathCss
              key={i}
              d={d}
              className="fill-fg-loud stroke-fg-loud"
              // Make the character appear a bit bolder by using a thicker stroke.
              strokeWidth={20}
            />
          ))}
        {highlightedSegmentPaths.map((d, i) => (
          <PathCss
            key={`segment:${i}`}
            d={d}
            className="fill-fg-loud stroke-fg-loud"
            strokeWidth={20}
          />
        ))}
      </G>
    </Svg>
  );
}
