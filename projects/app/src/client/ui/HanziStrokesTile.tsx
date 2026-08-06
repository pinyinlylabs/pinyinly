import { hanziSvgPathsQuery } from "@/client/query";
import type { HanziCharacter as HanziCharacterType } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { formatAtom, parseStrokeSpec2 } from "@/util/strokeSpec";
import type { LayoutChangeEvent } from "react-native";
import { Text, View } from "react-native";
import { HanziCharacter } from "./HanziCharacter";
import type { HanziCharacterColor } from "./HanziCharacter.utils";
import { HanziLink } from "./HanziLink";

type TileHanzi = Parameters<typeof HanziLink>[0][`hanzi`];

type HighlightStrokeData = {
  strokeIndexes: number[];
  segmentPaths: string[];
};

function buildHighlightStrokeData(
  highlightStrokeRanges: string,
  segmentPathsByAtom: Record<string, string> | null,
): HighlightStrokeData {
  const strokeIndexes = new Set<number>();
  const segmentPaths: string[] = [];

  try {
    const parsed = parseStrokeSpec2(highlightStrokeRanges);

    for (const item of parsed) {
      for (const atom of item) {
        if (atom.kind === `range`) {
          for (let i = atom.start; i <= atom.end; i += 1) {
            strokeIndexes.add(i);
          }
          continue;
        }

        const atomKey = formatAtom(atom);
        const segmentPath = segmentPathsByAtom?.[atomKey];
        if (segmentPath != null) {
          segmentPaths.push(segmentPath);
          continue;
        }

        // Fallback: if the segment path hasn't been generated yet,
        // highlight the parent stroke so the UI still communicates intent.
        strokeIndexes.add(atom.stroke);
      }
    }
  } catch {
    return {
      strokeIndexes: [],
      segmentPaths: [],
    };
  }

  return {
    strokeIndexes: [...strokeIndexes],
    segmentPaths,
  };
}

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
  const segmentPathsByAtom = strokesData?.segments ?? null;
  const strokePaths = strokesData?.strokes ?? null;
  const highlightStrokeData = buildHighlightStrokeData(
    highlightStrokeRanges,
    segmentPathsByAtom,
  );
  const hasHighlightedStrokes =
    highlightStrokeData.strokeIndexes.length > 0 ||
    highlightStrokeData.segmentPaths.length > 0;
  const normalizedLabel = label?.trim() ?? ``;
  const hasNameLabel = normalizedLabel.length > 0;

  return (
    <View
      className={fillWidth ? `w-full items-center gap-2` : `items-start gap-2`}
    >
      <View className="min-w-12 items-center" onLayout={onVisualLayout}>
        {strokePaths != null && hasHighlightedStrokes ? (
          <HanziCharacter
            className="size-12"
            highlightColor={highlightColor}
            strokesData={strokePaths}
            highlightPaths={highlightStrokeData.segmentPaths}
            highlightStrokes={highlightStrokeData.strokeIndexes}
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
