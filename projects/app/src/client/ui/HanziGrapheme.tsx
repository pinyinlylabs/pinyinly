import { G, Svg } from "react-native-svg";
import { tv } from "tailwind-variants";
import z from "zod/v4";
import { PathCss } from "./svg";

export function HanziGrapheme(props: {
  strokesData: string[];
  highlightStrokes: number[];
  highlightColor?: HanziGraphemeColor;
  className?: string;
}) {
  const highlightedStrokes = new Set(props.highlightStrokes);

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
        {/* Bold Fill */}
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

export const hanziGraphemeColorSchema = z.enum([
  `blue`,
  `yellow`,
  `amber`,
  `cyanold`,
  `fg`,
]);

export type HanziGraphemeColor = z.infer<typeof hanziGraphemeColorSchema>;

const outlineClass = tv({
  base: `fill-bg-loud stroke-fg-loud`,
  variants: {
    color: {
      blue: `stroke-blue`,
      yellow: `stroke-yellow`,
      amber: `stroke-amber`,
      cyanold: `stroke-cyanold`,
      fg: `stroke-fg-loud`,
    },
  },
});
