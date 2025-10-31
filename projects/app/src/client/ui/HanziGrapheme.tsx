import { G, Svg } from "react-native-svg";
import { tv } from "tailwind-variants";
import { PathCss } from "./svg";

export function HanziGrapheme(props: {
  strokesData: string[];
  highlightStrokes: number[];
  highlightColor?: `blue` | `yellow`;
}) {
  const highlightedStrokes = new Set(props.highlightStrokes);

  return (
    <Svg viewBox="0 0 1024 1024" width="256" height="256" className="size-8">
      <G transform="scale(1, -1) translate(0, -900)">
        {props.strokesData
          .filter((_, i) => !highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss
              key={i}
              d={d}
              className="fill-bg-loud stroke-fg-bg40"
              strokeWidth={20}
            />
          ))}
        {/* Outline */}
        {props.strokesData
          .filter((_, i) => highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss
              key={i}
              d={d}
              className={outlineClass({ color: props.highlightColor })}
              strokeWidth={120}
            />
          ))}
        {/* Fill */}
        {props.strokesData
          .filter((_, i) => highlightedStrokes.has(i))
          .map((d, i) => (
            <PathCss
              key={i}
              d={d}
              className="fill-bg-loud stroke-bg-loud"
              // Make the character appear a bit bolder by using a thicker stroke.
              strokeWidth={20}
            />
          ))}
      </G>
    </Svg>
  );
}

const outlineClass = tv({
  base: `fill-bg-loud stroke-fg-loud`,
  variants: {
    color: {
      blue: `stroke-blue`,
      yellow: `stroke-yellow`,
    },
  },
});
