import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import { useLookupHanzi } from "@/client/hooks/useLookupHanzi";
import {
  getWikiMdxHanziMeaning,
  getWikiMdxHanziMeaningMnemonic,
  getWikiMdxHanziPronunciation,
  getWikiMdxHanziWordMeaning,
} from "@/client/wiki";
import type { HanziText, PinyinSyllable } from "@/data/model";
import { MDXComponents } from "@bacons/mdx";
import type { PropsWithChildren } from "react";
import { Fragment, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { useIntersectionObserver } from "usehooks-ts";
import { IconImage } from "./IconImage";

const hr = <View className="h-px bg-fg/25" />;

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) {
  const [tab, setTab] = useState<`meaning` | `pronunciation`>(`meaning`);

  const wikiEntry = useHanziWikiEntry(hanzi);
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
  const PronunciationMdx = getWikiMdxHanziPronunciation(hanzi);
  const MeaningMnemonicMdx = getWikiMdxHanziMeaningMnemonic(hanzi);

  return (
    <>
      <ScrollView
        className={
          // Use a linear gradient on the background so that rubber band
          // scrolling showing the correct color at the top and bottom.
          `
            h-screen
            bg-[linear-gradient(to_bottom,_var(--color-cyanold)_0%,_var(--color-cyanold)_50%,_var(--color-bg)_50%,_var(--color-bg)_100%)]
          `
        }
        contentContainerClassName="pb-10 min-h-full"
      >
        <Header
          title={title}
          tab={tab}
          subtitle={glosses}
          onDismiss={onDismiss}
          onTabChange={(tab) => {
            setTab(tab);
          }}
        />

        <PylyMdxComponents>
          <View className={contentClass({ active: tab === `meaning` })}>
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
          </View>

          <View className={contentClass({ active: tab === `pronunciation` })}>
            {PronunciationMdx == null ? null : <PronunciationMdx />}
          </View>
        </PylyMdxComponents>
      </ScrollView>
    </>
  );
}

const contentClass = tv({
  base: `flex-1 gap-6 bg-bg py-7`,
  variants: {
    active: {
      true: `flex`,
      false: `hidden`,
    },
  },
});

function Header({
  title,
  subtitle,
  onDismiss,
  tab,
  onTabChange,
}: {
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
  tab: `meaning` | `pronunciation`;
  onTabChange?: (tab: `meaning` | `pronunciation`) => void;
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

        <View
          className={`
            h-[32px] flex-1 flex-row transition-opacity

            ${isIntersecting2 ? `opacity-100` : `opacity-0`}
          `}
        >
          <HeaderTab
            label="Meaning"
            isActive={tab === `meaning`}
            onPress={() => {
              onTabChange?.(`meaning`);
            }}
          />
          <HeaderTab
            label="Pronunciation"
            isActive={tab === `pronunciation`}
            onPress={() => {
              onTabChange?.(`pronunciation`);
            }}
          />
          <View
            className={
              // Half-width view, transitioned between left and middle offset.
              `
                -translate-x-1/2 absolute bottom-0 h-1 w-1/2 rounded bg-fg-loud transition-[left]

                ${tab === `meaning` ? `left-0` : `left-1/2`}
              `
            }
          />
        </View>
        <View className="sticky top-[64px] h-px w-full bg-fg-loud" />
      </View>
    </>
  );
}

function HeaderTab({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <View className={`min-w-40 flex-1 px-1 py-3`}>
      <Pressable
        className={`
          w-full select-none items-center rounded px-4 py-2 transition-[opacity,transform]

          hover:bg-fg-loud/10

          active:scale-95
        `}
        onPress={() => {
          onPress();
        }}
      >
        <Text
          className={`
            font-sans text-[18px]/normal text-fg-loud

            ${isActive ? `font-semibold` : `font-medium`}
          `}
        >
          {label}
        </Text>
      </Pressable>
    </View>
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

function PylyMdxComponents({ children }: PropsWithChildren) {
  return (
    <MDXComponents
      components={{
        blockquote: ({ children }: PropsWithChildren) => (
          <View className="pyly-mdx-blockquote">{children}</View>
        ),
        p: ({ children }: PropsWithChildren) => (
          <Text className="pyly-body pyly-mdx-p">{children}</Text>
        ),
        Highlight: ({ children }: PropsWithChildren) => (
          <Text className="pyly-highlight">{children}</Text>
        ),

        Hanzi: ({ children }: PropsWithChildren) => children,
        Translated: ({ children }: PropsWithChildren) => children,

        Examples: ({ children }: PropsWithChildren) => <>{children}</>,
        Example: ({
          hanzi,
          translated,
        }: PropsWithChildren<{ hanzi: string; translated: string }>) => (
          <View className="px-4">
            <Text className="pyly-body">{hanzi}</Text>
            <Text className="pyly-body">{translated}</Text>
          </View>
        ),
        Example2: ({ children }: PropsWithChildren) => (
          <View className="px-4">
            <Text>{children}</Text>
          </View>
        ),
        em: ({ children }: PropsWithChildren) => (
          <Text className="pyly-highlight">{children}</Text>
        ),
        ul: ({ children }: PropsWithChildren) => (
          <ul className="space-y-2">{children}</ul>
        ),
        li: ({ children }: PropsWithChildren) => (
          <li className="pyly-body">
            <Text className="pyly-body">{children}</Text>
          </li>
        ),
        strong: ({ children }: PropsWithChildren) => (
          <Text className="pyly-bold">{children}</Text>
        ),
        wrapper: ({ children }: PropsWithChildren) => (
          <View className="pyly-mdx space-y-4">{children}</View>
        ),
      }}
    >
      {children}
    </MDXComponents>
  );
}
