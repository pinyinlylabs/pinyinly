import { hanziSvgPathsQuery } from "@/client/query";
import type { HanziCharacter } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HanziGraphic } from "./HanziGraphic";
import { RectButton } from "./RectButton";
import { View } from "./View";

export function WikiHanziCharacterStrokeAnimation({
  hanzi,
}: {
  hanzi: HanziCharacter;
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
    <View className="flex-row items-center gap-1">
      <HanziGraphic
        className="size-16"
        bgSvgPaths={data.strokes}
        animatedMedianPaths={data.medians}
        animationKey={animationKey}
        accessibilityLabel={`${hanzi} stroke order`}
      />
      <RectButton
        accessibilityLabel={`Replay stroke order for ${hanzi}`}
        variant="bareDim"
        iconStart="repeat"
        iconSize={16}
        onPress={() => {
          setAnimationKey((previous) => previous + 1);
        }}
      />
    </View>
  );
}
