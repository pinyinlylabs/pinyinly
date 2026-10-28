import { hanziSvgPathsQuery, skipQuery } from "@/client/query";
import type { HanziSvgData } from "@/client/query";
import type {
  HanziCharacter,
  HanziStrokeColor,
  StrokeSpecString,
} from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { strokeSpecFilter, parseStrokeSpec } from "@/util/strokeSpec";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { HanziLink } from "./HanziLink";
import { HanziGraphic } from "./HanziGraphic";
import { Icon } from "./Icon";

function strokeIndicesFromSpec(strokeSpec: StrokeSpecString): number[] {
  return parseStrokeSpec(strokeSpec).flatMap((item) =>
    item.flatMap((atom) =>
      atom.kind === `range`
        ? Array.from(
            { length: atom.end - atom.start + 1 },
            (_, index) => atom.start + index,
          )
        : [atom.stroke],
    ),
  );
}

export function HanziStrokesAnimatedTile({
  hanzi,
  componentHanzi = null,
  componentStrokeSpec,
  componentColor,
  label = null,
  labelNumberOfLines,
  fillWidth = false,
  onVisualLayout,
  bold = true,
  autoPlay = false,
  hideFgWhenIdle = false,
}: {
  hanzi: HanziCharacter | null;
  componentHanzi?: HanziCharacter | null;
  componentStrokeSpec?: StrokeSpecString | null;
  componentColor?: HanziStrokeColor | null;
  label?: string | null;
  labelNumberOfLines?: number;
  fillWidth?: boolean;
  onVisualLayout?: (event: LayoutChangeEvent) => void;
  bold?: boolean;
  autoPlay?: boolean;
  hideFgWhenIdle?: boolean;
}) {
  const { data: strokesData, isLoading } = useQuery(
    hanzi == null
      ? skipQuery<HanziSvgData | null>()
      : hanziSvgPathsQuery(hanzi),
  );
  const [animationStarted, setAnimationStarted] = useState(autoPlay);
  const [animationKey, setAnimationKey] = useState(0);

  const strokePaths = strokesData?.strokes ?? [];
  const fgSvgPaths =
    componentStrokeSpec === undefined
      ? strokePaths
      : componentStrokeSpec == null || strokesData == null
        ? []
        : strokeSpecFilter(
            strokePaths,
            strokesData.segments ?? null,
            componentStrokeSpec,
          );
  const selectedStrokeIndices =
    componentStrokeSpec === undefined
      ? strokePaths.map((_, index) => index)
      : componentStrokeSpec == null
        ? []
        : strokeIndicesFromSpec(componentStrokeSpec);
  const selectedMedianPaths = selectedStrokeIndices.map(
    (index) => strokesData?.medians?.[index],
  );
  const validMedianPaths = selectedMedianPaths.filter(
    (median): median is string => median != null && median.trim().length > 0,
  );
  const hasValidMedianData =
    strokesData?.medians != null &&
    strokesData.medians.length === strokePaths.length &&
    strokesData.medians.every((median) => median.trim().length > 0);
  const canAnimate =
    fgSvgPaths.length > 0 &&
    hasValidMedianData &&
    validMedianPaths.length === fgSvgPaths.length &&
    validMedianPaths.length === selectedMedianPaths.length;

  const normalizedLabel = label?.trim() ?? ``;
  const hasNameLabel = normalizedLabel.length > 0;
  const colorClass = colorTextClass[componentColor ?? `fg`];
  const isComponentTile = componentStrokeSpec !== undefined;
  const strokeOrderHanzi = hanzi ?? `character`;
  const replayAction = animationStarted ? `Replay` : `Animate`;
  const replayLabel = `${replayAction} stroke order for ${strokeOrderHanzi}`;

  function handlePress() {
    setAnimationStarted(true);
    setAnimationKey((previous) => previous + 1);
  }

  const graphic = (
    <HanziGraphic
      key={animationKey}
      className={`
        ${isComponentTile ? `size-12` : `size-14`}
        ${colorClass}
      `}
      fgSvgPaths={fgSvgPaths}
      hideFgWhenIdle={hideFgWhenIdle}
      bgSvgPaths={strokePaths}
      fgSvgPathsMedians={
        canAnimate && animationStarted ? validMedianPaths : undefined
      }
      bold={bold}
      accessibilityLabel={
        canAnimate ? `${strokeOrderHanzi} stroke order` : undefined
      }
    />
  );

  if (!isComponentTile) {
    if (!canAnimate) {
      return null;
    }

    return (
      <Pressable
        accessibilityLabel={replayLabel}
        accessibilityRole="button"
        className="shrink-0"
        onPress={handlePress}
      >
        {graphic}
      </Pressable>
    );
  }

  return (
    <View
      className={fillWidth ? `w-full items-center gap-2` : `items-start gap-2`}
    >
      <View
        className="size-12 items-center justify-center"
        onLayout={onVisualLayout}
      >
        {isLoading ? null : canAnimate ? (
          <Pressable
            accessibilityLabel={replayLabel}
            accessibilityRole="button"
            className="shrink-0"
            onPress={handlePress}
          >
            {graphic}
          </Pressable>
        ) : fgSvgPaths.length > 0 ? (
          graphic
        ) : componentHanzi == null ? (
          <View accessibilityLabel="Character graphic unavailable" role="img">
            <Icon icon="circle-warning" tintColorClassName="accent-muted-fg" />
          </View>
        ) : (
          <Text className="pyly-body text-center text-lg">
            {componentHanzi}
          </Text>
        )}
      </View>

      <Text
        className="pyly-body w-full text-center"
        ellipsizeMode={labelNumberOfLines == null ? undefined : `tail`}
        numberOfLines={labelNumberOfLines}
      >
        {componentHanzi == null ? (
          label
        ) : (
          <HanziLink hanzi={componentHanzi}>
            {hasNameLabel ? normalizedLabel : componentHanzi}
          </HanziLink>
        )}
      </Text>
    </View>
  );
}

const colorTextClass = {
  fg: `text-fg`,
  blue: `text-blue`,
  yellow: `text-yellow`,
  amber: `text-amber`,
  cyanold: `text-cyanold`,
} as const;
