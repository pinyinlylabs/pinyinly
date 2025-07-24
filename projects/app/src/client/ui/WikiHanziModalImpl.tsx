import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import { useLookupHanzi } from "@/client/hooks/useLookupHanzi";
import type { HanziText, PinyinSyllable } from "@/data/model";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { CustomComponentsProp } from "@bacons/mdx";
import { MDXComponents } from "@bacons/mdx";
import type { PropsWithChildren } from "react";
import { Fragment, lazy, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { useIntersectionObserver } from "usehooks-ts";
import { IconImage } from "./IconImage";

type MdxComponent = React.FC<{
  components?: CustomComponentsProp;
}>;

const lazyMdx = <Mdx extends MdxComponent>(
  importFn: () => Promise<{ default: Mdx }>,
) =>
  lazy(async () => {
    await devToolsSlowQuerySleepIfEnabled();
    return await importFn();
  });

// prettier-ignore
const wikiMdx: Record<string, MdxComponent> = {
  // <pyly-glob-template glob="../wiki/*/*.mdx" template="  \"${parentDir}/${filenameWithoutExt}\": lazyMdx(() => import(`${path}`)),">
  "上/meaning": lazyMdx(() => import(`../wiki/上/meaning.mdx`)),
  "上/meaningMnemonic": lazyMdx(() => import(`../wiki/上/meaningMnemonic.mdx`)),
  "上/pronunciation": lazyMdx(() => import(`../wiki/上/pronunciation.mdx`)),
  "上/~above.meaning": lazyMdx(() => import(`../wiki/上/~above.meaning.mdx`)),
  "上/~on.meaning": lazyMdx(() => import(`../wiki/上/~on.meaning.mdx`)),
  "你好/pronunciation": lazyMdx(() => import(`../wiki/你好/pronunciation.mdx`)),
  "你好/~hello.meaning": lazyMdx(() => import(`../wiki/你好/~hello.meaning.mdx`)),
// </pyly-glob-template>
};

// Rewrite the keys of the object to make it easier to look up specific
// fragments using the HanziWord or Hanzi. On the filesystem tilde (~) is used
// as the HanziWord separator, because `:` is not safe.
//
// - <Hanzi>/meaning
// - <Hanzi>/pronunciation
// - <Hanzi>/meaningMnemonic
// - <HanziWord>/meaning
// - <HanziWord>/pronunciation
for (const [key, value] of Object.entries(wikiMdx)) {
  const newKey = key.replaceAll(/\/~(.+?)\.(.+)/g, `:$1/$2`);
  if (newKey !== key) {
    wikiMdx[newKey] = value;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete wikiMdx[key];
  }
}

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

  const MeaningMdx = wikiMdx[`${hanzi}/meaning`];
  const PronunciationMdx = wikiMdx[`${hanzi}/pronunciation`];
  const MeaningMnemonicMdx = wikiMdx[`${hanzi}/meaningMnemonic`];

  return (
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
          title={title}
          tab={tab}
          subtitle={glosses}
          onDismiss={onDismiss}
          onTabChange={(tab) => {
            setTab(tab);
          }}
        />

        <PylyMdxComponents>
          <View
            className={`
              gap-6 bg-bg py-7

              ${tab === `meaning` ? `flex` : `hidden`}
            `}
          >
            {MeaningMdx == null ? null : <MeaningMdx />}

            {hanziWordMeanings.length > 1 ? (
              <View>
                {hanziWordMeanings.map(([hanziWord, meaning], i) => {
                  const gloss = meaning.gloss[0];
                  const ContentMdx = wikiMdx[`${hanziWord}/meaning`];
                  return gloss == null ? null : (
                    <Fragment key={i}>
                      {i === 0 ? hr : null}
                      <ExpandableSection title={`${hanzi} as “${gloss}”`}>
                        {ContentMdx == null ? null : <ContentMdx />}
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
                const ContentMdx = wikiMdx[`${hanziWord}/meaning`];
                return gloss == null || ContentMdx == null ? null : (
                  <View key={i}>
                    <ContentMdx />
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

          <View
            className={`
              gap-6 bg-bg py-7

              ${tab === `pronunciation` ? `flex` : `hidden`}
            `}
          >
            {PronunciationMdx == null ? null : <PronunciationMdx />}
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
        <View className="sticky top-0 z-10 h-[64px] flex-row items-center pl-4">
          <Pressable
            onPress={onDismiss}
            className={`
              size-8 rounded-md

              hover:bg-fg-loud/10
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
    <Pressable
      className={`
        min-w-40 flex-1 items-center border-fg-loud py-3

        ${isActive ? `border-b-2` : `border-b-0 opacity-80`}

        hover:bg-fg-loud/10
      `}
      onPress={() => {
        onPress();
      }}
    >
      <Text className="font-sans text-[18px]/normal font-semibold text-fg-loud">
        {label}
      </Text>
    </Pressable>
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
        <View className={containerClass()}>{titleElement}</View>
      ) : (
        <Pressable
          onPress={() => {
            setExpanded((x) => !x);
          }}
          className={containerClass({ className: `hover:bg-fg-bg20` })}
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

const containerClass = tv({
  base: `flex-row justify-between p-4 py-6`,
});

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
        Wrapper: ({ children }: PropsWithChildren) => (
          <View className="pyly-mdx space-y-4">{children}</View>
        ),
      }}
    >
      {children}
    </MDXComponents>
  );
}
