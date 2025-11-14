import type { HanziText } from "@/data/model";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import React from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { HanziGrapheme } from "./HanziGrapheme";

interface ComponentProps {
  strokes: string;
  color?: `blue` | `yellow` | `amber`;
  children: React.ReactNode;
}

/**
 * Specifies a component within a @see WikiHanziGraphemeDecomposition2.
 */
function Component(_props: ComponentProps) {
  return null;
}

interface VisualComponent {
  hanzi?: HanziText | HanziText[];
  gloss: string;
  strokes: string;
}

interface WikiHanziGraphemeDecomposition2Props {
  children: React.ReactNode;
  strokesData: string[];
  hanzi: HanziText;
  components: VisualComponent[];
  mnemonicTitle?: string;
  illustrationSrc?: RnRequireSource;
  illustrationFit?: `cover` | `contain`;
}

export const WikiHanziGraphemeDecomposition2 = Object.assign(
  function WikiHanziGraphemeDecomposition2({
    children,
    components,
    hanzi,
    strokesData,
    mnemonicTitle,
    illustrationSrc,
    illustrationFit,
  }: WikiHanziGraphemeDecomposition2Props) {
    const componentsElements: ReactNode[] = [];

    for (const [i, visualComponent] of components.entries()) {
      componentsElements.push(
        <View className="flex-1 items-center gap-2" key={i}>
          <View className="flex-row items-center gap-2">
            <HanziGrapheme
              strokesData={strokesData}
              highlightStrokes={visualComponent.strokes.split(`,`).map(Number)}
            />
            {visualComponent.hanzi == null ? null : Array.isArray(
                visualComponent.hanzi,
              ) ? (
              visualComponent.hanzi.map((hanzi, i) => (
                <Text className={visualCharClass()} key={i}>
                  {hanzi}
                </Text>
              ))
            ) : (
              <Text className={visualCharClass()}>{visualComponent.hanzi}</Text>
            )}
          </View>
          <Text className="pyly-body">{visualComponent.gloss}</Text>
        </View>,
      );
    }

    return (
      <View className="pyly-mdx-grapheme-decomposition rounded-lg bg-fg-bg5">
        <View className="gap-4 p-4">
          <Text className="pyly-body">
            Start by splitting <Text className="pyly-bold">{hanzi}</Text> into
            elements for a story:
          </Text>

          <View className="flex-row gap-5">{componentsElements}</View>
        </View>

        {illustrationSrc == null ? null : (
          <Image
            source={illustrationSrc}
            contentFit={illustrationFit}
            contentPosition="top center"
            className="h-[200px] w-full"
          />
        )}

        <View className="gap-4 p-4">
          <View className="items-center gap-1">
            {mnemonicTitle == null ? null : (
              <Text className="pyly-body">
                <Text className="pyly-bold">“{mnemonicTitle}”</Text>
              </Text>
            )}
            {children}
          </View>
        </View>
      </View>
    );
  },
  { Component },
);

const visualCharClass = tv({
  base: `pyly-body text-fg/50`,
});
