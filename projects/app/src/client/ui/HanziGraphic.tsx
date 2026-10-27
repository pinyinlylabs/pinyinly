import { useId } from "react";
import type { ComponentProps, ComponentType, CSSProperties } from "react";
import { Platform } from "react-native";
// oxlint-disable-next-line no-restricted-imports
import { Defs, G, Mask, Path, Svg } from "react-native-svg";
import { SvgPath } from "./SvgPath";

const strokeAnimationDuration = 300;
const brushGrowthDuration = 100;
const delayBetweenStrokes = 200;
const delayBeforeStart = 250;
const animatedBrushWidth = 180;

type AnimatedPathStyle = CSSProperties & {
  "--hanzi-stroke-duration": string;
  "--hanzi-stroke-delay": string;
  "--hanzi-brush-growth-duration": string;
  "--hanzi-brush-growth-width": string;
};

type AnimatedPathProps = ComponentProps<typeof Path> & {
  className?: string;
  pathLength?: number;
  style?: AnimatedPathStyle;
};

// react-native-svg supports these SVG/DOM props on web, but omits them from its shared Path type.
const AnimatedPath = Path as ComponentType<AnimatedPathProps>;

type AnimatedGroupStyle = CSSProperties & {
  "--hanzi-graphic-dim-delay": string;
};

type AnimatedGroupProps = ComponentProps<typeof G> & {
  className?: string;
  style?: AnimatedGroupStyle;
};

// react-native-svg's shared G props omit the custom CSS property used by the web animation.
const AnimatedGroup = G as ComponentType<AnimatedGroupProps>;

export function HanziGraphic(props: {
  bgSvgPaths?: string[];
  fgSvgPaths?: string[];
  animatedMedianPaths?: string[];
  animationKey?: number;
  bold?: boolean;
  accessibilityLabel?: string;
  className?: string;
}) {
  const id = useId().replaceAll(`:`, ``);
  const strokes = props.bgSvgPaths ?? props.fgSvgPaths ?? [];
  const maskIds = strokes.map((_, index) => `${id}-stroke-${index}`);
  const animatedMedianPaths = props.animatedMedianPaths;
  const strokeWidth = (props.bold ?? true) ? 20 : undefined;
  const animatedGraphicDimDelay =
    animatedMedianPaths == null
      ? null
      : delayBeforeStart +
        (animatedMedianPaths.length - 1) *
          (strokeAnimationDuration + delayBetweenStrokes) +
        strokeAnimationDuration;

  // Remount the SVG so its dimming animation restarts together with the strokes.
  return (
    <Svg
      key={props.animationKey}
      viewBox="0 0 1024 1024"
      width="256"
      height="256"
      className={`
        ${props.className ?? `size-8 shrink-0`}
      `}
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
            <Mask
              key={maskIds[index]}
              id={maskIds[index]}
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x="-1024"
              y="-1024"
              width="3072"
              height="3072"
            >
              <SvgPath
                d={stroke}
                fill="white"
                stroke="white"
                strokeWidth={strokeWidth}
              />
            </Mask>
          );
        })}
      </Defs>
      <G transform="scale(1, -1) translate(0, -900)">
        {props.bgSvgPaths?.map((d, i) => (
          <SvgPath
            key={i}
            d={d}
            fillClassName="accent-fg-bg40"
            strokeClassName="accent-fg-bg40"
            strokeWidth={strokeWidth}
          />
        ))}
        {animatedMedianPaths == null
          ? null
          : strokes.map((d, index) => (
              <SvgPath
                key={`${id}-outline-${index}-${props.animationKey ?? 0}`}
                d={d}
                fill="none"
                strokeClassName="accent-fg-bg40"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                id={`${id}-outline-${index}`}
              />
            ))}
        {animatedMedianPaths == null ? null : (
          <AnimatedGroup
            className="hanzi-animated-foreground"
            style={
              animatedGraphicDimDelay == null
                ? undefined
                : {
                    "--hanzi-graphic-dim-delay": `${animatedGraphicDimDelay}ms`,
                  }
            }
          >
            {animatedMedianPaths.map((d, index) => {
              const maskId = maskIds[index];
              return maskId == null || strokes[index] == null ? null : (
                <AnimatedPath
                  key={`${maskId}-${props.animationKey ?? 0}`}
                  d={d}
                  mask={`url(#${maskId})`}
                  fill="none"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={animatedBrushWidth}
                  stroke="var(--color-fg-loud)"
                  className="hanzi-animated-stroke"
                  style={{
                    "--hanzi-stroke-delay": `${delayBeforeStart + index * (strokeAnimationDuration + delayBetweenStrokes)}ms`,
                    "--hanzi-stroke-duration": `${strokeAnimationDuration}ms`,
                    "--hanzi-brush-growth-duration": `${brushGrowthDuration}ms`,
                    "--hanzi-brush-growth-width": `${animatedBrushWidth}px`,
                  }}
                />
              );
            })}
          </AnimatedGroup>
        )}
        {props.fgSvgPaths?.map((d, i) => (
          <SvgPath
            key={i}
            d={d}
            fillClassName="accent-fg-loud"
            strokeClassName="accent-fg-loud"
            strokeWidth={strokeWidth}
          />
        ))}
      </G>
    </Svg>
  );
}
