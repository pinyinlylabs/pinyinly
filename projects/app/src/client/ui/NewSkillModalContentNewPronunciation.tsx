import type { HanziText, PinyinText } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "./Icon";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { useDb } from "./hooks/useDb";

export const NewSkillModalContentNewPronunciation = ({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) => {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        })),
    [db.dictionarySearch, hanzi],
  );

  let pinyin: PinyinText | undefined;
  for (const entry of dictionarySearchEntries) {
    if (entry.pinyin != null) {
      const mainPinyin = entry.pinyin[0];
      if (mainPinyin != null) {
        pinyin = mainPinyin;
        break;
      }
    }
  }

  let title: string = hanzi;
  if (pinyin != null) {
    title += ` (${pinyin})`;
  }

  const glosses =
    dictionarySearchEntries.length === 1
      ? dictionarySearchEntries[0]?.gloss.join(`, `)
      : dictionarySearchEntries.map((entry) => entry.gloss[0]).join(`, `);

  return (
    <ScrollView
      className={
        // Use a linear gradient on the background so that rubber band
        // scrolling showing the correct color at the top and bottom.
        `
          h-screen
          bg-[linear-gradient(to_bottom,_var(--color-theme-grass-panel-bg)_0%,_var(--color-theme-grass-panel-bg)_50%,_var(--color-bg)_50%,_var(--color-bg)_100%)]
        `
      }
      contentContainerClassName="pb-10 min-h-full"
    >
      <Header title={title} subtitle={glosses} onDismiss={onDismiss} />

      <PylyMdxComponents>
        <View className="flex-1 gap-2 bg-bg py-7">
          <View className="flex-row items-center gap-2 px-4">
            <Icon
              icon="voice-square"
              size={32}
              className="text-[var(--color-theme-grass-panel-bg)]"
            />
            <Text className="pyly-body-title text-fg-loud">Pronunciation</Text>
          </View>
        </View>
      </PylyMdxComponents>
    </ScrollView>
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
  const [ref, entry] = useIntersectionObserver();

  return (
    <>
      {/* Scroll detector */}
      <View
        className="absolute top-[60px] h-0 w-full"
        ref={(el) => {
          ref(el as Element | null);
        }}
      />

      <View className="theme-grass-panel sticky top-[-120px] z-10 h-[184px] bg-bg">
        <View className="sticky top-1 z-10 h-[56px] flex-row items-center pl-4">
          <Pressable
            onPress={onDismiss}
            className={`
              size-8 rounded-md transition-transform

              hover:bg-fg-loud/10

              active:scale-95
            `}
          >
            <Icon icon="close" size={32} className="text-fg-loud" />
          </Pressable>
        </View>

        <View className="mb-2 self-center rounded-md bg-fg-loud/10 px-2 py-1">
          <Text
            className={`
              text-center font-sans text-[12px]/[14px] font-bold uppercase text-fg-loud
              transition-all
            `}
          >
            New pronunciation
          </Text>
        </View>

        <View className="sticky top-[11px] z-0 overflow-visible px-4">
          <Text
            className={`
              text-center font-sans text-[28px]/[42px] font-bold text-fg-loud transition-all

              ${entry?.isIntersecting === false ? `scale-[0.75]` : `scale-100`}
            `}
          >
            {title}
          </Text>
        </View>

        <View className="">
          <Text
            className={`
              text-center font-sans text-[18px] font-normal text-fg-loud transition-opacity

              ${entry?.isIntersecting === false ? `opacity-0` : `opacity-100`}
            `}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </>
  );
}
