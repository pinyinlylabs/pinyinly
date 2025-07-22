import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import type { HanziText } from "@/data/model";
import { lookupHanzi } from "@/dictionary/dictionary";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useIntersectionObserver } from "usehooks-ts";
import { IconImage } from "./IconImage";
import { Pylymark } from "./Pylymark";

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) {
  const wikiEntry = useHanziWikiEntry(hanzi);
  void wikiEntry;

  const hanziWordMeanings = useLocalQuery({
    queryKey: [WikiHanziModalImpl.name, `meanings`, hanzi],
    queryFn: async () => {
      const res = await lookupHanzi(hanzi);
      return res;
    },
  });

  return hanziWordMeanings.data == null ? null : (
    <>
      <ScrollView
        className={
          // Use a linear gradient on the background so that rubber band
          // scrolling showing the correct color at the top and bottom.
          `
            flex-1
            bg-[linear-gradient(to_bottom,_var(--color-cyanold)_0%,_var(--color-cyanold)_50%,_var(--color-bg)_50%,_var(--color-bg)_100%)]
          `
        }
        contentContainerClassName="pb-10"
      >
        <Header
          title={`${hanzi} (shàng)`}
          subtitle="up, on, start"
          onDismiss={onDismiss}
        />

        <View className="gap-6 bg-bg py-7">
          <View className="gap-2 px-4">
            <Text className="pyly-body">
              <Pylymark source="{上:up} is a common Chinese word meaning **up**, **on**, or **start**. It appears in 80% of all movies in the last 10 years." />
            </Text>
            <Text className="pyly-body">
              <Pylymark source="The opposite of {上:up} is {下:down}." />
            </Text>
          </View>

          <View>
            <View className="h-px bg-fg/25" />

            <ExpandableSection title="上 as “up”" />

            <View className="h-px bg-fg/25" />

            <ExpandableSection title="上 as “on”" />

            <View className="h-px bg-fg/25" />

            <ExpandableSection title="上 as “start”" />

            <View className="h-px bg-fg/25" />
          </View>

          <View className="gap-6 bg-bg-loud py-5">
            <View className="gap-4 px-4">
              <View className="flex-row gap-2">
                <IconImage
                  source={require(`@/assets/icons/bulb.svg`)}
                  size={24}
                  className="text-yellow"
                />
                <Text className="pyly-body-heading">HOW TO REMEMBER IT</Text>
              </View>

              <Text className="pyly-body">
                <Pylymark source="**上** and **下** look distinctive and are almost flipped versions of each other. It’s easy to picture them in your mind as real world objects." />
              </Text>
            </View>

            <View>
              <View className="h-px bg-fg/25" />

              <ExpandableSection title="上 as a flag pole" />

              <View className="h-px bg-fg/25" />

              <ExpandableSection title="下 as a tree root" />

              <View className="h-0 bg-fg/25" />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function Header({
  title,
  subtitle,
  onDismiss,
  onShowMeaning,
  onShowPronunciation,
}: {
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
  onShowMeaning?: () => void;
  onShowPronunciation?: () => void;
}) {
  const [ref1, isIntersecting1] = useIntersectionObserver({
    // threshold: 1,
    initialIsIntersecting: true,
  });

  const [ref2, isIntersecting2] = useIntersectionObserver({
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

      {/* Scroll detector */}
      <View
        className="absolute top-[72px] h-0 w-full"
        ref={(el) => {
          ref2(el as Element | null);
        }}
      />

      <View className="sticky top-[-120px] z-10 h-[184px] bg-cyanold">
        <View className="sticky top-0 z-10 h-[64px] flex-row items-center pl-4">
          <Pressable
            onPress={onDismiss}
            className={`
              size-8 opacity-75

              hover:opacity-100
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
              text-center font-sans text-[18px] font-semibold text-fg-loud transition-opacity

              ${isIntersecting1 ? `opacity-100` : `opacity-0`}
            `}
          >
            {subtitle}
          </Text>
        </View>

        <View
          className={`
            h-[32px] flex-1 flex-row transition-opacity

            ${isIntersecting2 ? `opacity-100` : `opacity-0`}
          `}
        >
          <Pressable
            className={`flex-1 items-center border-b-2 border-fg-loud py-3`}
            onPress={onShowMeaning}
          >
            <Text className="font-sans text-[18px]/normal font-semibold text-fg-loud">
              Meaning
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center border-b-0 border-fg-loud py-3 opacity-80`}
            onPress={onShowPronunciation}
          >
            <Text className="font-sans text-[18px]/normal font-semibold text-fg-loud">
              Pronunciation
            </Text>
          </Pressable>
        </View>
        <View className="sticky top-[64px] h-px w-full bg-fg-loud" />
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
  return (
    <View>
      <Pressable
        onPress={() => {
          setExpanded((x) => !x);
        }}
        className={`
          flex-row justify-between px-4 py-6

          hover:bg-fg-bg20
        `}
      >
        <Text className="pyly-body-heading">{title}</Text>
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
      {children}
    </View>
  );
}
