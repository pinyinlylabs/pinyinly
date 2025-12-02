import {
  getWikiMdxHanziMeaning,
  getWikiMdxHanziWordMeaning,
} from "@/client/wiki";
import type { HanziText, PinyinSyllable } from "@/data/model";
import { loadDictionary } from "@/dictionary/dictionary";
import type { ReactNode } from "react";
import { Fragment, use, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useIntersectionObserver } from "usehooks-ts";
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

  let pinyin: readonly PinyinSyllable[] | undefined;
  for (const [, meaning] of hanziWordMeanings) {
    if (meaning.pinyin != null) {
      const mainPinyin = meaning.pinyin[0];
      if (mainPinyin != null) {
        pinyin = mainPinyin;
        break;
      }
    }
  }

  let title: string = hanzi;
  if (pinyin != null) {
    title += ` (${pinyin.join(` `)})`;
  }

  const glossesArray =
    hanziWordMeanings.length === 1
      ? hanziWordMeanings[0]?.[1].gloss
      : hanziWordMeanings.map(([, meaning]) => meaning.gloss[0]);

  const glosses = glossesArray?.join(`, `);

  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);

  return (
    <>
      <ScrollView
        className={
          // Use a linear gradient on the background so that rubber band
          // scrolling showing the correct color at the top and bottom.
          `
            h-screen
            bg-[linear-gradient(to_bottom,_var(--color-theme-sky-bg)_0%,_var(--color-theme-sky-bg)_50%,_var(--color-bg)_50%,_var(--color-bg)_100%)]
          `
        }
        contentContainerClassName="pb-10 min-h-full"
      >
        <Header title={title} subtitle={glosses} onDismiss={onDismiss} />

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
  subtitle,
  onDismiss,
}: {
  title: string;
  subtitle?: string;
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

      <View className="theme-sky sticky top-[-120px] z-10 h-[184px] bg-bg">
        <View className="sticky top-1 z-10 h-[56px] flex-row items-center pl-4">
          <Pressable
            onPress={onDismiss}
            className={`
              size-8 rounded-md transition-transform

              hover:bg-fg-loud/10

              active:scale-95
            `}
          >
            <IconImage
              source={require(`@/assets/icons/close.svg`)}
              size={32}
              className="text-fg-loud"
            />
          </Pressable>
        </View>

        <View className="sticky top-[11px] z-0 overflow-visible px-4">
          <Text
            className={`
              text-center font-sans text-[28px]/[42px] font-bold text-fg-loud transition-all

              ${isIntersecting1 ? `scale-100` : `scale-[0.75]`}
            `}
          >
            {title}
          </Text>
        </View>

        <View className="">
          <Text
            className={`
              text-center font-sans text-[18px] font-normal text-fg-loud transition-opacity

              ${isIntersecting1 ? `opacity-100` : `opacity-0`}
            `}
          >
            {subtitle}
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
