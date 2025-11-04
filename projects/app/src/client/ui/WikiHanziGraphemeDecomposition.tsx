import { Image } from "expo-image";
import type { ReactNode } from "react";
import React, { Children, Fragment } from "react";
import { View } from "react-native";
import { HanziGrapheme } from "./HanziGrapheme";

interface ComponentProps {
  strokes: string;
  color?: `blue` | `yellow` | `amber`;
  children: React.ReactNode;
}

/**
 * Specifies a component within a @see WikiHanziGraphemeDecomposition.
 */
function Component(_props: ComponentProps) {
  return null;
}

interface WikiHanziGraphemeDecompositionProps {
  children: React.ReactNode;
  strokesData: string[];
  illustrationSrc?: RnRequireSource;
  illustrationFit?: `cover` | `contain`;
}

export const WikiHanziGraphemeDecomposition = Object.assign(
  function WikiHanziGraphemeDecomposition({
    children,
    strokesData,
    illustrationSrc,
    illustrationFit,
  }: WikiHanziGraphemeDecompositionProps) {
    const mnemonic: ReactNode[] = [];
    const components: ReactNode[] = [];

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
            contentFit={illustrationFit}
            contentPosition="top center"
            className="h-[200px] w-full rounded-b-lg"
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
