import { useLookupHanzi } from "@/client/hooks/useLookupHanzi";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { hanziWikiEntryQuery, pinyinSoundsQuery } from "@/client/query";
import {
  getWikiMdxHanziMeaning,
  getWikiMdxHanziMeaningMnemonic,
  getWikiMdxHanziWordMeaning,
} from "@/client/wiki";
import type { HanziText, PinyinSoundId, PinyinSyllable } from "@/data/model";
import { parsePinyinSyllable } from "@/data/pinyin";
import { useSuspenseQuery } from "@tanstack/react-query";
import React, { Fragment, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useIntersectionObserver } from "usehooks-ts";
import { IconImage } from "./IconImage";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";

const hr = <View className="h-px bg-fg/25" />;

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) {
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

  const glossesArray =
    hanziWordMeanings.length === 1
      ? hanziWordMeanings[0]?.[1].gloss
      : hanziWordMeanings.map(([, meaning]) => meaning.gloss[0]);

  const glosses = glossesArray?.join(`, `);

  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);
  const MeaningMnemonicMdx = getWikiMdxHanziMeaningMnemonic(hanzi);

  const primaryGloss = glossesArray?.[0];
  const firstPinyin = pinyin?.[0];
  const isSingleSyllable = pinyin?.length === 1;

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

            {!isSingleSyllable ||
            firstPinyin == null ||
            primaryGloss == null ? null : (
              // Only render the pronunciation section if this is a single
              // character word, and there's a pinyin and gloss.
              <PronunciationMnemonicSection
                hanzi={hanzi}
                primaryPinyin={firstPinyin}
                gloss={primaryGloss}
              />
            )}
          </View>
        </PylyMdxComponents>
      </ScrollView>
    </>
  );
}

function PronunciationMnemonicSection({
  hanzi,
  primaryPinyin: pinyin,
  gloss,
}: {
  gloss: string;
  hanzi: HanziText;
  primaryPinyin: PinyinSyllable;
}) {
  const parsedPinyin = parsePinyinSyllable(pinyin);
  const r = useReplicache();
  const { data: pinyinSounds } = useRizzleQueryPaged(pinyinSoundsQuery(r));

  const initialPinyinSound =
    parsedPinyin == null
      ? null
      : pinyinSounds?.get(parsedPinyin.initialSoundId as PinyinSoundId);
  const finalPinyinSound =
    parsedPinyin == null
      ? null
      : pinyinSounds?.get(parsedPinyin.finalSoundId as PinyinSoundId);
  const tonePinyinSound =
    parsedPinyin == null
      ? null
      : pinyinSounds?.get(parsedPinyin.tone.toString() as PinyinSoundId);

  return (
    <View className="mt-4 gap-3">
      <View className="mx-4">
        <Text className="pyly-body-heading">
          Use a story to learn the pronunciation
        </Text>
      </View>

      <View className="mx-4 rounded-lg bg-fg/5">
        <View className="gap-4 p-4">
          <Text className="pyly-body">
            <Text className="pyly-bold">{hanzi}</Text> is pronounced
            {` `}
            <Text className="pyly-bold">{pinyin}</Text>.
          </Text>

          <Text className="pyly-body">
            Use a story about &ldquo;
            <Text className="pyly-bold">{gloss}</Text>
            &rdquo; to remember the initial, the final, and the tone of
            {` `}
            <Text className="pyly-bold">{pinyin}</Text>.
          </Text>
        </View>

        {parsedPinyin == null ? null : (
          <View className="gap-4 p-4">
            <View className="">
              <Text className="pyly-body text-center">
                <Text className="pyly-bold">{pinyin}</Text>
              </Text>
              <View className="px-[15%] py-2">
                <ThreeSplitLinesDown className="h-[10px] w-full" />
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {parsedPinyin.initialSoundId}
                  </Text>
                  {initialPinyinSound == null ? null : (
                    <>
                      <DownArrow />
                      <Text className="pyly-body">
                        <Text className="pyly-ref">
                          {initialPinyinSound.name}
                        </Text>
                      </Text>
                    </>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {parsedPinyin.finalSoundId}
                  </Text>
                  {finalPinyinSound == null ? null : (
                    <>
                      <DownArrow />
                      <Text className="pyly-body">
                        <Text className="pyly-ref">
                          {finalPinyinSound.name}
                        </Text>
                      </Text>
                    </>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {parsedPinyin.tone}
                    <Text className="align-super text-[10px]">
                      {ordinalSuffix(parsedPinyin.tone)}
                    </Text>
                  </Text>
                  {tonePinyinSound == null ? null : (
                    <>
                      <DownArrow />
                      <Text className="pyly-body">
                        <Text className="pyly-ref">{tonePinyinSound.name}</Text>
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
        {__DEV__ ? (
          <>
            <View className="h-[400px] w-full border-fg/50 bg-fg/50"></View>
            <View className="px-4 py-2">
              <Text className="pyly-body-caption text-fg">
                In the lavish, dimly lit Broadway Bathroom, a crucial
                business MEETING is violently interrupted. A neon-clad Hula
                Hooper, mistaking the tall-ceilinged space for a fitness studio,
                spins her giant hoop wildly, scattering papers and forcing the
                shocked attendees to immediately adjourn their makeshift
                conference.
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function DownArrow() {
  return <Text className="pyly-body h-6 text-fg/40">↓</Text>;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) {
    return `th`;
  }
  switch (n % 10) {
    case 1: {
      return `st`;
    }
    case 2: {
      return `nd`;
    }
    case 3: {
      return `rd`;
    }
    default: {
      return `th`;
    }
  }
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
  children?: React.ReactNode;
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
