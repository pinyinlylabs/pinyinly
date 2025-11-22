import type { GraphemeData } from "@/client/wiki";
import { allGraphemeComponents } from "@/client/wiki";
import { parseIndexRanges } from "@/util/indexRanges";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { HanziGrapheme, hanziGraphemeColorSchema } from "./HanziGrapheme";
import { Pylymark } from "./Pylymark";

interface WikiHanziGraphemeDecompositionProps {
  graphemeData: GraphemeData;
  illustrationSrc?: RnRequireSource;
  illustrationFit?: `cover` | `contain`;
}

export function WikiHanziGraphemeDecomposition({
  graphemeData,
  illustrationSrc,
  illustrationFit,
}: WikiHanziGraphemeDecompositionProps) {
  const componentsElements: ReactNode[] = [];

  if (graphemeData.mnemonic && Array.isArray(graphemeData.strokes)) {
    for (const [i, visualComponent] of [
      ...allGraphemeComponents(graphemeData.mnemonic.components),
    ].entries()) {
      componentsElements.push(
        <View className="flex-1 items-center gap-2" key={i}>
          <View className="flex-row items-center gap-2">
            <HanziGrapheme
              className="size-12"
              highlightColor={hanziGraphemeColorSafeSchema.parse(
                visualComponent.color,
              )}
              strokesData={graphemeData.strokes}
              highlightStrokes={parseIndexRanges(visualComponent.strokes)}
            />
            {visualComponent.hanzi?.split(`,`).map((hanzi, i) => (
              <Text className={visualCharClass()} key={i}>
                {hanzi}
              </Text>
            ))}
          </View>
          <Text className="pyly-body text-center">{visualComponent.label}</Text>
        </View>,
      );
    }
  }

  return (
    <>
      <Text className="pyly-mdx-h2"> Use a story to learn the meaning</Text>
      <View className="pyly-mdx-grapheme-decomposition rounded-lg bg-fg-bg5">
        <View className="gap-4 p-4 pb-0">
          {componentsElements.length > 0 ? (
            <>
              <Text className="pyly-body">
                Split{` `}
                <Text className="pyly-bold">{graphemeData.hanzi}</Text> into
                distinctive components:
              </Text>

              <View className="flex-row gap-5">{componentsElements}</View>
            </>
          ) : Array.isArray(graphemeData.strokes) ? (
            <>
              <Text className="pyly-body">
                What does{` `}
                <Text className="pyly-bold">{graphemeData.hanzi}</Text>
                {` `}
                resemble?
              </Text>

              <View className="flex-1 items-center">
                <HanziGrapheme
                  className="size-12"
                  strokesData={graphemeData.strokes}
                  highlightStrokes={parseIndexRanges(
                    `0-${graphemeData.strokes.length - 1}`,
                  )}
                />
              </View>
            </>
          ) : null}
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

        {graphemeData.mnemonic?.stories == null ? null : (
          <View className="gap-4 p-4 pt-0">
            <Text className="pyly-body">Then connect it to the meaning:</Text>

            <View className="gap-1">
              {graphemeData.mnemonic.stories.map((mnemonic, i) => (
                <View className="gap-1" key={i}>
                  <View className="flex-row items-center gap-2">
                    <View className="m-1 size-3 rounded-full border-2 border-fg-bg25" />
                    <Text className="pyly-body">
                      <Text className="pyly-bold">{mnemonic.gloss}</Text>
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
        )}
      </View>
    </>
  );
}

// eslint-disable-next-line unicorn/prefer-top-level-await
const hanziGraphemeColorSafeSchema = hanziGraphemeColorSchema.catch(`fg`);

const visualCharClass = tv({
  base: `pyly-body text-fg/50`,
});
