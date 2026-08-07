import { hanziSvgPathsQuery } from "@/client/query";
import type {
  HanziCharacter as HanziCharacterType,
  HanziStrokeColor,
  StrokeSpecString,
} from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { strokeSpecFilter } from "@/util/strokeSpec";
import type { LayoutChangeEvent } from "react-native";
import { Text, View } from "react-native";
import { HanziLink } from "./HanziLink";
import { HanziGraphic } from "./HanziGraphic";

export function HanziStrokesTile({
  componentHanzi,
  componentStrokeSpec,
  componentColor,
  hanzi,
  label,
  labelNumberOfLines,
  fillWidth = false,
  onVisualLayout,
}: {
  componentColor?: HanziStrokeColor | null;
  componentHanzi: HanziCharacterType | null;
  componentStrokeSpec: StrokeSpecString | null | undefined;
  hanzi: HanziCharacterType | null;
  label: string | null;
  labelNumberOfLines?: number;
  fillWidth?: boolean;
  onVisualLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { data: strokesData } = useQuery(hanziSvgPathsQuery(hanzi));

  if (strokesData == null) {
    return null;
  }
  const segmentPathsByAtom = strokesData.segments ?? null;
  const strokePaths = strokesData.strokes;

  const fgSvgPaths =
    componentStrokeSpec == null
      ? []
      : strokeSpecFilter(
          strokePaths,
          segmentPathsByAtom ?? null,
          componentStrokeSpec,
        );

  const normalizedLabel = label?.trim() ?? ``;
  const hasNameLabel = normalizedLabel.length > 0;
  const colorClass = colorTextClass[componentColor ?? `fg`];

  return (
    <View
      className={fillWidth ? `w-full items-center gap-2` : `items-start gap-2`}
    >
      <View className="min-w-12 items-center" onLayout={onVisualLayout}>
        {strokePaths != null && fgSvgPaths.length > 0 ? (
          <HanziGraphic
            className={`
              size-12

              ${colorClass}
            `}
            fgSvgPaths={fgSvgPaths}
            bgSvgPaths={strokePaths}
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

const colorTextClass = {
  fg: `text-fg`,
  blue: `text-blue`,
  yellow: `text-yellow`,
  amber: `text-amber`,
  cyanold: `text-cyanold`,
} as const;
