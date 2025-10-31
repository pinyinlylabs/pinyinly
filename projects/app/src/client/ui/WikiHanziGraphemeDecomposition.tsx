import { Image } from "expo-image";
import type { ReactNode } from "react";
import React, { Children } from "react";
import { View } from "react-native";
import { HanziGrapheme } from "./HanziGrapheme";

interface ComponentProps {
  strokes: string;
  color?: `blue` | `yellow`;
  children: React.ReactNode;
}

/**
 * Specifies a component within a @see WikiHanziGraphemeDecomposition.
 */
function Component(_props: ComponentProps) {
  return null;
}

export const WikiHanziGraphemeDecomposition = Object.assign(
  function WikiHanziGraphemeDecomposition({
    children,
    strokesData,
    illustrationSrc,
  }: {
    children: React.ReactNode;
    strokesData: string[];
    illustrationSrc?: RnRequireSource;
  }) {
    const mnemonic: ReactNode[] = [];
    const components: ReactNode[] = [];

    Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === Component) {
          const props2 = child.props as ComponentProps;
          components.push(
            <ComponentImpl {...props2} strokesData={strokesData} />,
          );
          return;
        }

        mnemonic.push(child);
        return;
      }
    });

    return (
      <View className="pyly-mdx-grapheme-decomposition rounded-lg bg-fg-bg5">
        <View className="gap-4 p-4">
          {mnemonic}

          <View className="border-t-[0.5px] border-dashed border-fg/25" />

          <View className="gap-5">{components}</View>
        </View>

        {illustrationSrc == null ? null : (
          <Image
            source={illustrationSrc}
            contentFit="contain"
            className="h-[200px] w-full"
          />
        )}
      </View>
    );
  },
  { Component },
);

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
