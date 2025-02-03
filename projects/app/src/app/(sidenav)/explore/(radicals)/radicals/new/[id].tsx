import { CloseButton } from "@/client/ui/CloseButton";
import { QuizProgressBar } from "@/client/ui/QuizProgressBar";
import { RectButton2 } from "@/client/ui/RectButton2";
import { ReferencePage } from "@/client/ui/ReferencePage";
import { ReferencePageBodySection } from "@/client/ui/ReferencePageBodySection";
import { ReferencePageHeader } from "@/client/ui/ReferencePageHeader";
import { GradientAqua, GradientPink } from "@/client/ui/styles";
import {
  lookupRadicalByHanzi,
  lookupRadicalNameMnemonics,
} from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

const svgData = {
  strokes: [
    `M 486 664 Q 567 679 655 692 Q 716 704 725 711 Q 735 718 731 728 Q 724 741 694 749 Q 667 755 557 725 Q 415 695 308 689 Q 271 685 296 666 Q 339 641 408 653 Q 421 656 437 656 L 486 664 Z`,
    `M 473 416 Q 584 432 754 435 Q 826 435 833 446 Q 839 459 819 476 Q 756 518 716 508 Q 629 489 486 463 L 424 453 Q 300 435 162 414 Q 138 410 156 391 Q 172 376 193 370 Q 218 364 236 370 Q 320 395 413 407 L 473 416 Z`,
    `M 413 407 Q 409 394 406 378 Q 349 159 154 41 Q 136 29 131 23 Q 128 16 141 14 Q 186 8 284 81 Q 398 171 466 390 Q 469 403 473 416 L 486 463 Q 513 586 523 610 Q 533 631 512 646 Q 497 656 486 664 C 461 681 430 685 437 656 Q 456 602 424 453 L 413 407 Z`,
    `M 926 73 Q 910 119 899 200 Q 898 216 890 222 Q 881 228 877 206 Q 858 109 842 91 Q 811 58 684 53 Q 615 54 585 66 Q 558 79 553 96 Q 543 124 546 197 Q 553 278 569 315 Q 582 346 563 364 Q 511 404 495 401 Q 479 395 486 377 Q 507 337 501 279 Q 492 101 515 62 Q 539 20 627 7 Q 688 -2 785 2 Q 873 6 907 25 Q 938 41 926 73 Z`,
  ],
  medians: [
    [
      [300, 679],
      [330, 672],
      [381, 672],
      [651, 720],
      [719, 723],
    ],
    [
      [160, 402],
      [216, 394],
      [345, 420],
      [718, 471],
      [780, 466],
      [825, 452],
    ],
    [
      [444, 653],
      [478, 628],
      [483, 618],
      [480, 590],
      [445, 417],
      [415, 318],
      [388, 256],
      [334, 168],
      [262, 91],
      [174, 34],
      [139, 22],
    ],
    [
      [498, 387],
      [534, 345],
      [537, 333],
      [522, 220],
      [526, 105],
      [538, 71],
      [572, 45],
      [622, 32],
      [706, 27],
      [813, 37],
      [869, 56],
      [880, 64],
      [884, 92],
      [887, 213],
    ],
  ],
};

export default function RadicalPage() {
  const { id } = useLocalSearchParams<`/explore/radicals/[id]`>();

  const query = useQuery({
    queryKey: [`character.radical`, id],
    queryFn: async () => {
      const [radical, nameMnemonics] = await Promise.all([
        lookupRadicalByHanzi(id),
        lookupRadicalNameMnemonics(id),
      ]);
      return { radical, nameMnemonics };
    },
    throwOnError: true,
  });

  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <View className="flex-1 items-center bg-background">
      <View className="w-[100%] max-w-[600px] flex-row items-center gap-3 pt-safe-offset-4 px-safe-or-4">
        <CloseButton tintColor="#3C464D" />
        <QuizProgressBar
          progress={0.5}
          colors={
            [`#3F4CF5`, `#3F4CF5`] // solid blue
          }
        />
      </View>
      <ScrollView contentContainerClassName="px-safe-or-4 flex-1 pb-2">
        <View className="flex-row items-center gap-2 self-center py-4">
          <Image
            className="h-[32px] w-[32px] flex-shrink text-[#04ABF6]"
            source={require(`@/assets/icons/loader.svg`)}
            tintColor="currentColor"
          />
          <Text className="font-body text-lg font-bold uppercase text-[#04ABF6]">
            New Word
          </Text>
        </View>

        <View className="items-center justify-center gap-5">
          <Text className="font-cursive text-5xl text-text">not</Text>
          <View className="items-center gap-2">
            <LinearGradient
              colors={GradientPink}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 0.5 }}
              className="rounded-3xl p-6"
            >
              <Svg height="300" width="300">
                <G transform="translate(20, 248.515625) scale(0.25390625, -0.25390625)">
                  {svgData.strokes.map((d, i) => (
                    <Path key={i} d={d} fill="white" />
                  ))}
                </G>
              </Svg>
            </LinearGradient>
            <Text className="text-3xl text-text opacity-50">
              ⿱ <Text className="font-chinese">一 尢</Text>
            </Text>
          </View>
        </View>

        <View className="flex-1"></View>

        <View className="max-w-[400px] justify-center">
          <Text className="text-center text-2xl text-text">
            Imagine a straight line on top of a bent person trying to stand up
            but failing, so they are{` `}
            <Text className="font-bold text-[#04ABF6]">not</Text>
            {` `}
            able to rise.
          </Text>
        </View>

        <View className="h-1 w-2 flex-1"></View>
        <View className="h-1 w-2 flex-1"></View>

        <View className="w-[100%] max-w-[600px] flex-col items-stretch gap-3 mb-safe-offset-2">
          <RectButton2
            variant="outline"
            onPress={() => {
              setShowExplanation((x) => !x);
            }}
          >
            I Don&apos;t Get It
          </RectButton2>
          <RectButton2 variant="filled" accent>
            Next
          </RectButton2>
        </View>

        {showExplanation ? (
          <View className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-primary-6">
            <View className="my-2 h-2 w-12 self-center rounded bg-primary-8" />

            <View>
              <Text className="self-center font-semibold text-text">
                Explanation
              </Text>
            </View>

            <View className="mt-6 flex-row items-center gap-2 self-center">
              <Text className="font-chinese text-5xl text-text">无</Text>
              <Text className="text-5xl text-text opacity-50">•</Text>
              <Text className="font-cursive text-5xl text-text">not</Text>
            </View>

            <View className="my-4 flex-row items-center gap-2 self-center">
              <Text className="text-2xl text-text">
                <Text className="opacity-50">⿱</Text>
                {` `}
                <Text className="font-chinese">一 尢</Text>
              </Text>
            </View>

            <View className="flex-row items-center gap-2 px-2">
              <Svg height={260 / 3.5} width={260 / 3.5}>
                <G
                  transform={`translate(${0 / 3.5}, ${228.515625 / 3.5}) scale(${0.25390625 / 3.5}, ${-0.25390625 / 3.5})`}
                  fill={`none`}
                >
                  {svgData.strokes.slice(1).map((d, i) => (
                    <Path
                      key={i}
                      d={d}
                      strokeWidth="18"
                      strokeDasharray="24 24"
                      strokeOpacity={0.8}
                      stroke="white"
                    />
                  ))}
                  {svgData.strokes.slice(1).map((d, i) => (
                    <Path key={i} d={d} fill="#323538" />
                  ))}
                  {svgData.strokes.slice(0, 1).map((d, i) => (
                    <Path key={i} d={d} fill="white" />
                  ))}
                </G>
              </Svg>
              <View className="flex-1">
                <Text className="text-text">
                  <Text className="opacity-50">The</Text> 一 at the top{` `}
                  <Text className="opacity-50">is like a</Text> straight line or
                  a boundary.
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 px-2">
              <Svg height={260 / 3.5} width={260 / 3.5}>
                <G
                  transform={`translate(${0 / 3.5}, ${228.515625 / 3.5}) scale(${0.25390625 / 3.5}, ${-0.25390625 / 3.5})`}
                  fill={`none`}
                >
                  {svgData.strokes.slice(0, 1).map((d, i) => (
                    <Path
                      key={i}
                      d={d}
                      strokeWidth="18"
                      strokeDasharray="24 24"
                      strokeOpacity={0.8}
                      stroke="white"
                    />
                  ))}
                  {svgData.strokes.slice(0, 1).map((d, i) => (
                    <Path key={i} d={d} fill="#323538" />
                  ))}
                  {svgData.strokes.slice(1).map((d, i) => (
                    <Path key={i} d={d} fill="white" />
                  ))}
                </G>
              </Svg>
              <View className="flex-1">
                <Text className="text-text">
                  <Text className="opacity-50">The</Text> 尢 underneath{` `}
                  <Text className="opacity-50">looks like a</Text> person trying
                  to stand{` `}
                  <Text className="opacity-50">but bending in a way</Text> they
                  can <Text className="underline">not</Text> fully rise.
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 px-2">
              <Svg height={260 / 3.5} width={260 / 3.5}>
                <G
                  transform={`translate(${0 / 3.5}, ${228.515625 / 3.5}) scale(${0.25390625 / 3.5}, ${-0.25390625 / 3.5})`}
                  fill={`none`}
                >
                  {svgData.strokes.map((d, i) => (
                    <Path key={i} d={d} fill="white" />
                  ))}
                </G>
              </Svg>
              <View className="flex-1">
                <Text className="text-text">
                  Imagine someone lying under a line, unable to stand up,
                  illustrating the concept of &apos;not&apos; able to overcome.
                </Text>
              </View>
            </View>

            <View className="min-h-8 flex-1"></View>

            <View className="mx-4 items-stretch gap-3 mb-safe-offset-4">
              <RectButton2
                variant="outline"
                onPress={() => {
                  setShowExplanation((x) => !x);
                }}
              >
                I Don&apos;t Get It
              </RectButton2>
              <RectButton2 variant="filled" accent>
                Next
              </RectButton2>
            </View>
          </View>
        ) : null}

        {Math.random() > 0 ? null : (
          <ReferencePage
            header={
              <ReferencePageHeader
                gradientColors={GradientAqua}
                title={id}
                subtitle={query.data?.radical?.name[0] ?? null}
              />
            }
            body={
              query.isLoading ? (
                <Text className="text-text">Loading</Text>
              ) : query.isError ? (
                <Text className="text-text">Error</Text>
              ) : (
                <>
                  {query.data?.nameMnemonics != null ? (
                    <ReferencePageBodySection title="Mnemonics">
                      <View className="flex-col gap-2">
                        {query.data.nameMnemonics.map(
                          ({ mnemonic, rationale }, i) => (
                            <View key={i} className="gap-1">
                              <Text className="text-text">{mnemonic}</Text>
                              <Text className="text-xs italic text-primary-10">
                                {rationale}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    </ReferencePageBodySection>
                  ) : null}
                  {query.data?.radical != null ? (
                    <ReferencePageBodySection title="Meaning">
                      {query.data.radical.name.join(`, `)}
                    </ReferencePageBodySection>
                  ) : null}
                  {query.data?.radical?.pinyin != null ? (
                    <ReferencePageBodySection title="Pinyin">
                      {query.data.radical.pinyin.join(`, `)}
                    </ReferencePageBodySection>
                  ) : null}
                </>
              )
            }
          />
        )}
      </ScrollView>
    </View>
  );
}
