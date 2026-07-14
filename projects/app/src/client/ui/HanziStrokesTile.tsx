import { hanziSvgPathsQuery } from "@/client/query";
import type { HanziCharacter as HanziCharacterType } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { parseIndexRanges } from "@/util/indexRanges";
import type { LayoutChangeEvent } from "react-native";
import { Text, View } from "react-native";
import { HanziCharacter } from "./HanziCharacter";
import type { HanziCharacterColor } from "./HanziCharacter.utils";
import { HanziLink } from "./HanziLink";

type TileHanzi = Parameters<typeof HanziLink>[0][`hanzi`];

export function HanziStrokesTile({
  componentHanzi,
  hanzi,
  label,
  highlightStrokeRanges,
  highlightColor,
  labelNumberOfLines,
  fillWidth = false,
  onVisualLayout,
}: {
  componentHanzi: TileHanzi | null;
  hanzi: HanziCharacterType | null;
  label: string | null;
  highlightStrokeRanges: string;
  highlightColor?: HanziCharacterColor;
  labelNumberOfLines?: number;
  fillWidth?: boolean;
  onVisualLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { data: strokesData } = useQuery(hanziSvgPathsQuery(hanzi));
  const hasHighlightedStrokes = highlightStrokeRanges.trim().length > 0;
  const normalizedLabel = label?.trim() ?? ``;
  const hasNameLabel = normalizedLabel.length > 0;

  return (
    <View
      className={fillWidth ? `w-full items-center gap-2` : `items-start gap-2`}
    >
      <View className="min-w-12 items-center" onLayout={onVisualLayout}>
        {strokesData != null && hasHighlightedStrokes ? (
          <HanziCharacter
            className="size-12"
            highlightColor={highlightColor}
            strokesData={strokesData}
            highlightStrokes={parseIndexRanges(highlightStrokeRanges)}
          />
        ) : componentHanzi == null ? null : (
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
