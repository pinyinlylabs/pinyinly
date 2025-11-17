import type { HanziText } from "@/data/model";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import React from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { HanziGrapheme } from "./HanziGrapheme";
import { Pylymark } from "./Pylymark";

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
  label: string;
  strokes: string;
}

interface WikiHanziGraphemeDecomposition2Props {
  strokesData: string[];
  hanzi: HanziText;
  components: VisualComponent[];
  mnemonics?: {
    meaning: string;
    story: string;
    children?: { meaning: string; story: string }[];
  }[];
  illustrationSrc?: RnRequireSource;
  illustrationFit?: `cover` | `contain`;
}

export const WikiHanziGraphemeDecomposition2 = Object.assign(
  function WikiHanziGraphemeDecomposition2({
    components,
    hanzi,
    strokesData,
    mnemonics,
    illustrationSrc,
    illustrationFit,
  }: WikiHanziGraphemeDecomposition2Props) {
    const componentsElements: ReactNode[] = [];

    for (const [i, visualComponent] of components.entries()) {
      componentsElements.push(
        <View className="flex-1 items-center gap-2" key={i}>
          <View className="flex-row items-center gap-2">
            <HanziGrapheme
              className="size-12"
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
          <Text className="pyly-body">{visualComponent.label}</Text>
        </View>,
      );
    }

    return (
      <>
        <Text className="pyly-mdx-h2"> Use a story to learn the meaning</Text>
        <View className="pyly-mdx-grapheme-decomposition rounded-lg bg-fg-bg5">
          <View className="gap-4 p-4 pb-0">
            <Text className="pyly-body">
              Start by splitting <Text className="pyly-bold">{hanzi}</Text> into
              elements for a story:
            </Text>

            <View className="flex-row gap-5">{componentsElements}</View>
          </View>

          {illustrationSrc == null ? (
            <View className="h-4" />
          ) : (
            <Image
              source={illustrationSrc}
              contentFit={illustrationFit}
              contentPosition="top center"
              className="my-4 h-[200px] w-full"
            />
          )}

          <View className="gap-4 p-4 pt-0">
            <Text className="pyly-body">Then connect it to the meaning:</Text>

            <View className="items-center gap-1">
              {mnemonics?.map((mnemonic, i) => (
                <View className="gap-1" key={i}>
                  <View className="flex-row items-center gap-2">
                    <View className="m-1 size-3 rounded-full border-2 border-fg-bg25" />
                    <Text className="pyly-body">
                      <Text className="pyly-bold">{mnemonic.meaning}</Text>
                    </Text>
                  </View>
                  <View className="pl-7">
                    <Text className="pyly-body">
                      <Pylymark source={mnemonic.story} />
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </>
    );
  },
  { Component },
);

const visualCharClass = tv({
  base: `pyly-body text-fg/50`,
});
