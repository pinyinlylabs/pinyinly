import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { WikiCharacterData } from "@/data/model";
import { loadDictionary } from "@/dictionary";
import { parseIndexRanges } from "@/util/indexRanges";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { use } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { HanziCharacter, hanziCharacterColorSchema } from "./HanziCharacter";
import { HanziLink } from "./HanziLink";
import { Pylymark } from "./Pylymark";

interface WikiHanziCharacterDecompositionProps {
  characterData: WikiCharacterData;
  illustrationSrc?: RnRequireSource;
  illustrationFit?: `cover` | `contain`;
}

export function WikiHanziCharacterDecomposition({
  characterData,
  illustrationSrc,
  illustrationFit,
}: WikiHanziCharacterDecompositionProps) {
  const componentsElements: ReactNode[] = [];
  const dictionary = use(loadDictionary());

  if (characterData.mnemonic && Array.isArray(characterData.strokes)) {
    for (const [i, visualComponent] of [
      ...walkIdsNodeLeafs(characterData.mnemonic.components),
    ].entries()) {
      componentsElements.push(
        <View className="flex-1 items-center gap-2" key={i}>
          <View className="flex-row items-center gap-2">
            <HanziCharacter
              className="size-12"
              highlightColor={hanziCharacterColorSafeSchema.parse(
                visualComponent.color,
              )}
              strokesData={characterData.strokes}
              highlightStrokes={parseIndexRanges(visualComponent.strokes)}
            />
            {visualComponent.hanzi == null ? null : (
              <Text className={visualCharClass()}>
                <HanziLink hanzi={visualComponent.hanzi}>
                  {visualComponent.hanzi}
                </HanziLink>
              </Text>
            )}
          </View>
          <Text className="pyly-body text-center">
            {visualComponent.label ??
              (visualComponent.hanzi == null
                ? null
                : dictionary
                    .lookupHanzi(visualComponent.hanzi)
                    .map(([, meaning]) => meaning.gloss[0])
                    .join(` / `))}
          </Text>
        </View>,
      );
    }
  }

  return (
    <>
      <Text className="pyly-mdx-h2"> Use a story to learn the meaning</Text>
      <View className="pyly-mdx-character-decomposition rounded-lg bg-fg-bg5">
        <View className="gap-4 p-4 pb-0">
          {componentsElements.length > 0 ? (
            <>
              <Text className="pyly-body">
                Split{` `}
                <Text className="pyly-bold">{characterData.hanzi}</Text> into
                distinctive components:
              </Text>

              <View className="flex-row gap-5">{componentsElements}</View>
            </>
          ) : Array.isArray(characterData.strokes) ? (
            <>
              <Text className="pyly-body">
                What does{` `}
                <Text className="pyly-bold">{characterData.hanzi}</Text>
                {` `}
                resemble?
              </Text>

              <View className="flex-1 items-center">
                <HanziCharacter
                  className="size-12"
                  strokesData={characterData.strokes}
                  highlightStrokes={parseIndexRanges(
                    `0-${characterData.strokes.length - 1}`,
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

        {characterData.mnemonic?.stories == null ? null : (
          <View className="gap-4 p-4 pt-0">
            <Text className="pyly-body">Then connect it to the meaning:</Text>

            <View className="gap-1">
              {characterData.mnemonic.stories.map((mnemonic, i) => (
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
const hanziCharacterColorSafeSchema = hanziCharacterColorSchema.catch(`fg`);

const visualCharClass = tv({
  base: `pyly-body text-fg/50`,
});
