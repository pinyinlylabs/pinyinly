import { G, Svg } from "react-native-svg";
import { SvgPath } from "./SvgPath";

export function HanziGraphic(props: {
  bgSvgPaths?: string[];
  fgSvgPaths?: string[];
  className?: string;
}) {
  return (
    <Svg
      viewBox="0 0 1024 1024"
      width="256"
      height="256"
      className={props.className ?? `size-8 shrink-0`}
    >
      <G transform="scale(1, -1) translate(0, -900)">
        {/* Background fill */}
        {props.bgSvgPaths?.map((d, i) => (
          <SvgPath
            key={i}
            d={d}
            fillClassName="accent-fg-bg40"
            strokeClassName="accent-fg-bg40"
            strokeWidth={20}
          />
        ))}
        {/* Accent Fill */}
        {props.fgSvgPaths?.map((d, i) => (
          <SvgPath
            key={i}
            d={d}
            fillClassName="accent-fg-loud"
            strokeClassName="accent-fg-loud"
            // Make the character appear a bit bolder by using a thicker stroke.
            strokeWidth={20}
          />
        ))}
      </G>
    </Svg>
  );
}
