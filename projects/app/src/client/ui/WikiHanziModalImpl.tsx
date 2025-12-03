import {
  getWikiMdxHanziMeaning,
  getWikiMdxHanziWordMeaning,
} from "@/client/wiki";
import type { HanziText } from "@/data/model";
import { loadDictionary } from "@/dictionary/dictionary";
import type { ReactNode } from "react";
import { Fragment, use, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useIntersectionObserver } from "usehooks-ts";
import { CloseButton2 } from "./CloseButton2";
import { IconImage } from "./IconImage";
import { PylyMdxComponents } from "./PylyMdxComponents";

const hr = <View className="h-px bg-fg/25" />;

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) {
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi);

  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);

  return (
    <>
      <ScrollView
        className={
          // Use a linear gradient on the background so that rubber band
          // scrolling showing the correct color at the top and bottom.
          `h-screen`
        }
        contentContainerClassName="pb-10 min-h-full"
      >
        <Header title={hanzi} onDismiss={onDismiss} />

        <PylyMdxComponents>
          <View className="flex-1 gap-6 bg-bg py-7">
            {MeaningMdx == null ? null : <MeaningMdx />}

            {hanziWordMeanings.length > 1 ? (
              <View>
                {hanziWordMeanings.map(([hanziWord, meaning], i) => {
                  const gloss = meaning.gloss[0];
                  const MeaningMdx = getWikiMdxHanziWordMeaning(hanziWord);
                  return gloss == null ? null : (
                    <Fragment key={i}>
                      {i === 0 ? hr : null}
                      <ExpandableSection title={`${hanzi} as “${gloss}”`}>
                        {MeaningMdx == null ? null : <MeaningMdx />}
                      </ExpandableSection>
                      {hr}
                    </Fragment>
                  );
                })}
              </View>
            ) : // Super hacky way to unwrap the meaning content and not have it
            // wrapped in a collapsible section.
            hanziWordMeanings.length === 1 ? (
              hanziWordMeanings.slice(0, 1).map(([hanziWord, meaning], i) => {
                const gloss = meaning.gloss[0];
                const MeaningMdx = getWikiMdxHanziWordMeaning(hanziWord);
                return gloss == null || MeaningMdx == null ? null : (
                  <View key={i}>
                    <MeaningMdx />
                  </View>
                );
              })
            ) : null}
          </View>
        </PylyMdxComponents>
      </ScrollView>
    </>
  );
}

function Header({
  title,
  onDismiss,
}: {
  title: string;
  onDismiss?: () => void;
}) {
  const [ref1, isIntersecting1] = useIntersectionObserver({
    // threshold: 1,
    initialIsIntersecting: true,
  });

  return (
    <>
      {/* Scroll detector */}
      <View
        className="absolute top-[44px] h-0 w-full"
        ref={(el) => {
          ref1(el as Element | null);
        }}
      />

      <View className="sticky top-[-102px] z-10">
        <View
          className={`sticky top-0 z-10 h-[56px] flex-row items-center bg-bg/90 pl-4`}
        >
          <CloseButton2 onPress={onDismiss} />
        </View>

        <View
          className={`
            theme-sky z-20 h-[150px] min-w-[150px] items-center justify-center place-self-center
            overflow-visible rounded-lg bg-bg px-4 transition-all

            ${isIntersecting1 ? `scale-100` : `scale-[0.25]`}
          `}
        >
          <Text
            className={`text-center font-sans text-[100px]/[100px] font-bold text-fg-loud`}
          >
            {title}
          </Text>
        </View>
      </View>
    </>
  );
}

function ExpandableSection({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const titleElement = <Text className="pyly-body-heading">{title}</Text>;

  return (
    <View>
      {children == null ? (
        <View className="flex-row justify-between p-4 py-6">
          {titleElement}
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setExpanded((x) => !x);
          }}
          className={`
            mx-2 my-4 select-none flex-row justify-between rounded-lg p-2

            hover:bg-fg-bg10
          `}
        >
          {titleElement}
          <IconImage
            source={
              expanded
                ? require(`@/assets/icons/chevron-down.svg`)
                : require(`@/assets/icons/chevron-up.svg`)
            }
            size={24}
            className="text-fg-bg50"
          />
        </Pressable>
      )}
      <View
        className={`
          mb-4

          ${
            // Always render the content so that any async suspense content is
            // caught on the first render, rather than having spinners after it's
            // presented.
            expanded ? `flex` : `hidden`
          }
        `}
      >
        {children}
      </View>
    </View>
  );
}
