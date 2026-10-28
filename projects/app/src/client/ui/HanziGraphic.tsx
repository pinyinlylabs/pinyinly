import { useId } from "react";
import type { ComponentProps, ComponentType, CSSProperties } from "react";
import { Platform } from "react-native";
// oxlint-disable-next-line no-restricted-imports
import { Defs, G, Mask, Path, Svg } from "react-native-svg";
import { hanziStrokeAnimationTiming } from "./HanziStrokeAnimation";
import { SvgPath } from "./SvgPath";

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
  /** SVG paths for the character's background strokes. */
  bgSvgPaths?: string[];
  /** SVG paths for the foreground strokes. */
  fgSvgPaths?: string[];
  /** Centerline paths corresponding by index to `fgSvgPaths`, used to animate them. */
  fgSvgPathsMedians?: string[];
  /** When true, render foreground paths statically instead of animating them. */
  disableAnimation?: boolean;
  /** When true, keep the foreground hidden until its animation starts. */
  hideFgWhenIdle?: boolean;
  /** Whether to render strokes with the bold outline width. Defaults to true. */
  bold?: boolean;
  /** Accessible name for the SVG image. */
  accessibilityLabel?: string;
  /** Additional classes applied to the SVG element. */
  className?: string;
}) {
  const id = useId().replaceAll(`:`, ``);
  const fgSvgPaths = props.fgSvgPaths ?? [];
  const fgSvgPathsMedians = props.fgSvgPathsMedians;
  const maskIds = fgSvgPaths.map((_, index) => `${id}-stroke-${index}`);
  const disableAnimation = props.disableAnimation ?? false;
  const strokeWidth = (props.bold ?? true) ? 20 : undefined;
  const animatedGraphicDimDelay =
    fgSvgPathsMedians == null || disableAnimation
      ? null
      : hanziStrokeAnimationTiming.delayBeforeStart +
        (fgSvgPathsMedians.length - 1) *
          (hanziStrokeAnimationTiming.strokeAnimationDuration +
            hanziStrokeAnimationTiming.delayBetweenStrokes) +
        hanziStrokeAnimationTiming.strokeAnimationDuration;

  return (
    <Svg
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
        {fgSvgPathsMedians == null || disableAnimation
          ? null
          : fgSvgPathsMedians.map((_, index) => {
              const stroke = fgSvgPaths[index];
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
        {fgSvgPathsMedians == null || disableAnimation
          ? null
          : fgSvgPaths.map((d, index) => (
              <SvgPath
                key={`${id}-outline-${index}`}
                d={d}
                fill="none"
                strokeClassName="accent-fg-bg40"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                id={`${id}-outline-${index}`}
              />
            ))}
        {fgSvgPathsMedians == null || disableAnimation ? null : (
          <AnimatedGroup
            className={
              props.hideFgWhenIdle ? `hanzi-animated-foreground` : undefined
            }
            style={
              animatedGraphicDimDelay == null
                ? undefined
                : {
                    "--hanzi-graphic-dim-delay": `${animatedGraphicDimDelay}ms`,
                  }
            }
          >
            {fgSvgPathsMedians.map((d, index) => {
              const maskId = maskIds[index];
              return maskId == null || fgSvgPaths[index] == null ? null : (
                <AnimatedPath
                  key={maskId}
                  d={d}
                  mask={`url(#${maskId})`}
                  fill="none"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={animatedBrushWidth}
                  stroke={`var(--color-fg-loud)`}
                  className="hanzi-animated-stroke"
                  style={{
                    "--hanzi-stroke-delay": `${hanziStrokeAnimationTiming.delayBeforeStart + index * (hanziStrokeAnimationTiming.strokeAnimationDuration + hanziStrokeAnimationTiming.delayBetweenStrokes)}ms`,
                    "--hanzi-stroke-duration": `${hanziStrokeAnimationTiming.strokeAnimationDuration}ms`,
                    "--hanzi-brush-growth-duration": `${hanziStrokeAnimationTiming.brushGrowthDuration}ms`,
                    "--hanzi-brush-growth-width": `${animatedBrushWidth}px`,
                  }}
                />
              );
            })}
          </AnimatedGroup>
        )}
        {props.hideFgWhenIdle ||
        (fgSvgPathsMedians != null && !disableAnimation)
          ? null
          : props.fgSvgPaths?.map((d, i) => (
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
