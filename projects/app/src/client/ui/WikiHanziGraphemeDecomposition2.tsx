import type { HanziText } from "@/data/model";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import React, { Children, Fragment } from "react";
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
    components: visualComponentsData,
    hanzi,
    strokesData,
    mnemonicTitle,
    illustrationSrc,
    illustrationFit,
  }: WikiHanziGraphemeDecomposition2Props) {
    const mnemonic: ReactNode[] = [];
    const components: ReactNode[] = [];
    const visualComponents: ReactNode[] = [];

    Children.forEach(children, (child, i) => {
      if (React.isValidElement(child)) {
        if (child.type === Component) {
          const props2 = child.props as ComponentProps;
          components.push(
            <ComponentImpl {...props2} strokesData={strokesData} key={i} />,
          );
          return;
        }

        mnemonic.push(<Fragment key={i}>{child}</Fragment>);
        return;
      }
    });

    for (const [i, visualComponent] of visualComponentsData.entries()) {
      visualComponents.push(
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

          <View className="flex-row gap-5">{visualComponents}</View>
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

function ComponentImpl({
  strokes,
  strokesData,
  color,
  children,
}: ComponentProps & { strokesData: string[] }) {
  return (
    <View className="flex-row items-center gap-3">
      <HanziGrapheme
        strokesData={strokesData}
        highlightStrokes={strokes.split(`,`).map(Number)}
        highlightColor={color}
      />
      {children}
    </View>
  );
}
