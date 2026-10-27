import { hanziSvgPathsQuery } from "@/client/query";
import type { HanziCharacter } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable } from "react-native";
import { HanziGraphic } from "./HanziGraphic";

export function HanziStrokesAnimatedTile({
  hanzi,
  bold = true,
}: {
  hanzi: HanziCharacter;
  bold?: boolean;
}) {
  const { data } = useQuery(hanziSvgPathsQuery(hanzi));
  const [animationKey, setAnimationKey] = useState(0);

  if (
    data?.strokes == null ||
    data.medians == null ||
    data.strokes.length === 0 ||
    data.strokes.length !== data.medians.length ||
    data.medians.some((median) => median.trim().length === 0)
  ) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={`Replay stroke order for ${hanzi}`}
      accessibilityRole="button"
      className="shrink-0"
      onPress={() => {
        setAnimationKey((previous) => previous + 1);
      }}
    >
      <HanziGraphic
        className="size-14"
        bgSvgPaths={data.strokes}
        animatedMedianPaths={data.medians}
        animationKey={animationKey}
        bold={bold}
        accessibilityLabel={`${hanzi} stroke order`}
      />
    </Pressable>
  );
}
