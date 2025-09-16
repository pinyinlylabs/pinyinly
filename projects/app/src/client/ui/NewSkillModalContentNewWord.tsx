import { useLookupHanzi } from "@/client/hooks/useLookupHanzi";
import { hanziWikiEntryQuery } from "@/client/query";
import {
  getWikiMdxHanziMeaning,
  getWikiMdxHanziMeaningMnemonic,
  getWikiMdxHanziWordMeaning,
} from "@/client/wiki";
import type { HanziText, PinyinSyllable } from "@/data/model";
import { useSuspenseQuery } from "@tanstack/react-query";
import React, { Fragment, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useIntersectionObserver } from "usehooks-ts";
import { IconImage } from "./IconImage";
import { PylyMdxComponents } from "./PylyMdxComponents";

const hr = <View className="h-px bg-fg/25" />;

export const NewSkillModalContentNewWord = ({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) => {
  const wikiEntry = useSuspenseQuery(hanziWikiEntryQuery(hanzi));
  void wikiEntry;

  const hanziWordMeanings = useLookupHanzi(hanzi);

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

  const glosses =
    hanziWordMeanings.length === 1
      ? hanziWordMeanings[0]?.[1].gloss.join(`, `)
      : hanziWordMeanings.map(([, meaning]) => meaning.gloss[0]).join(`, `);

  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);
  const MeaningMnemonicMdx = getWikiMdxHanziMeaningMnemonic(hanzi);

  return (
    <>
      <ScrollView
        className={
          // Use a linear gradient on the background so that rubber band
          // scrolling showing the correct color at the top and bottom.
          `
            h-screen
            bg-[linear-gradient(to_bottom,_var(--color-theme-grass-bg)_0%,_var(--color-theme-grass-bg)_50%,_var(--color-bg)_50%,_var(--color-bg)_100%)]
          `
        }
        contentContainerClassName="pb-10 min-h-full"
      >
        <Header title={title} subtitle={glosses} onDismiss={onDismiss} />

        <PylyMdxComponents>
          <View className="flex-1 gap-2 bg-bg py-7">
            <View className="flex-row items-center gap-2 px-4">
              <IconImage
                source={require(`@/assets/icons/note-2.svg`)}
                size={32}
                className="theme-grass text-bg"
              />
              <Text className="pyly-body-title text-fg-loud">Meaning</Text>
            </View>

            {MeaningMdx == null ? null : <MeaningMdx />}

            {hanziWordMeanings.length > 1 ? (
              <View>
                {hanziWordMeanings.map(([hanziWord, meaning], i) => {
                  const gloss = meaning.gloss[0];
                  const MeaningMdx = getWikiMdxHanziWordMeaning(hanziWord);
                  return gloss == null ? null : (
                    <Fragment key={i}>
                      {/* {i === 0 ? hr : null} */}
                      <ExpandableSection
                        title={`${hanzi} as “${gloss}”`}
                        defaultExpanded
                      >
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

            {MeaningMnemonicMdx == null ? null : (
              <View className="gap-6 bg-bg-loud py-5">
                <View className="flex-row gap-2 px-4">
                  <IconImage
                    source={require(`@/assets/icons/bulb.svg`)}
                    size={24}
                    className="text-yellow"
                  />
                  <Text className="pyly-body-heading">HOW TO REMEMBER IT</Text>
                </View>

                <MeaningMnemonicMdx />
              </View>
            )}
          </View>
        </PylyMdxComponents>
      </ScrollView>
    </>
  );
};

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
        className="absolute top-[60px] h-0 w-full"
        ref={(el) => {
          ref1(el as Element | null);
        }}
      />

      <View className="theme-grass sticky top-[-120px] z-10 h-[184px] bg-bg">
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

        <View className="mb-2 self-center rounded-md bg-fg-loud/10 px-2 py-1">
          <Text
            className={`
              text-center font-sans text-[12px]/[14px] font-bold uppercase text-fg-loud
              transition-all
            `}
          >
            New word
          </Text>
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
  defaultExpanded = false,
}: {
  title: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
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
