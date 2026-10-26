import { useId } from "react";
import type { ComponentProps, ComponentType, CSSProperties } from "react";
import { Platform } from "react-native";
// oxlint-disable-next-line no-restricted-imports
import { ClipPath, Defs, G, Path, Svg } from "react-native-svg";
import { SvgPath } from "./SvgPath";

const strokeAnimationDuration = 300;
const brushGrowthDuration = 100;
const delayBetweenStrokes = 200;
const delayBeforeStart = 250;

type AnimatedPathStyle = CSSProperties & {
  "--hanzi-stroke-duration": string;
  "--hanzi-brush-growth-duration": string;
};

type AnimatedPathProps = ComponentProps<typeof Path> & {
  className?: string;
  pathLength?: number;
  style?: AnimatedPathStyle;
};

// react-native-svg supports these SVG/DOM props on web, but omits them from its shared Path type.
const AnimatedPath = Path as ComponentType<AnimatedPathProps>;

export function HanziGraphic(props: {
  bgSvgPaths?: string[];
  fgSvgPaths?: string[];
  animatedMedianPaths?: string[];
  animationKey?: number;
  accessibilityLabel?: string;
  className?: string;
}) {
  const id = useId().replaceAll(`:`, ``);
  const strokes = props.bgSvgPaths ?? props.fgSvgPaths ?? [];
  const clipPathIds = strokes.map((_, index) => `${id}-stroke-${index}`);
  const animatedMedianPaths = props.animatedMedianPaths;

  return (
    <Svg
      viewBox="0 0 1024 1024"
      width="256"
      height="256"
      className={props.className ?? `size-8 shrink-0`}
      aria-hidden={props.accessibilityLabel == null ? true : undefined}
      accessible={
        Platform.OS === `web` ? undefined : props.accessibilityLabel != null
      }
      accessibilityRole={props.accessibilityLabel == null ? undefined : `image`}
      accessibilityLabel={props.accessibilityLabel}
    >
      <Defs>
        {animatedMedianPaths?.map((_, index) => {
          const stroke = strokes[index];
          return stroke == null ? null : (
            <ClipPath key={clipPathIds[index]} id={clipPathIds[index]}>
              <SvgPath d={stroke} />
            </ClipPath>
          );
        })}
      </Defs>
      <G transform="scale(1, -1) translate(0, -900)">
        {props.bgSvgPaths?.map((d, i) => (
          <SvgPath
            key={i}
            d={d}
            fillClassName="accent-fg-bg40"
            strokeClassName={
              animatedMedianPaths == null ? `accent-fg-bg40` : undefined
            }
            strokeWidth={animatedMedianPaths == null ? 20 : undefined}
          />
        ))}
        {animatedMedianPaths?.map((d, index) => {
          const clipPathId = clipPathIds[index];
          return clipPathId == null || strokes[index] == null ? null : (
            <AnimatedPath
              key={`${clipPathId}-${props.animationKey ?? 0}`}
              d={d}
              clipPath={`url(#${clipPathId})`}
              fill="none"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={140}
              stroke="var(--color-fg-loud)"
              className="hanzi-animated-stroke"
              style={{
                animationDelay: `${delayBeforeStart + index * (strokeAnimationDuration + delayBetweenStrokes)}ms`,
                "--hanzi-stroke-duration": `${strokeAnimationDuration}ms`,
                "--hanzi-brush-growth-duration": `${brushGrowthDuration}ms`,
              }}
            />
          );
        })}
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
