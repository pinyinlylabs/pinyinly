import type { HanziText } from "@/data/model";
import { loadDictionary } from "@/dictionary";
import type { IsExhaustedRest, PropsOf } from "@pinyinly/lib/types";
import { use, useState } from "react";
import { Text, View } from "react-native";
import { useIntersectionObserver, useTimeout } from "usehooks-ts";
import type { HanziTile } from "./HanziTile";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi);

  return (
    <>
      <Header
        hanzi={hanzi}
        pinyin={
          hanziWordMeanings.length === 1
            ? hanziWordMeanings[0]?.[1].pinyin?.[0]
            : undefined
        }
        gloss={
          hanziWordMeanings.length === 1
            ? hanziWordMeanings[0]?.[1].gloss[0]
            : undefined
        }
      />

      <PylyMdxComponents>
        <View className="flex-1 gap-6 bg-bg py-7">
          <WikiMdxHanziMeaning hanzi={hanzi} />
        </View>
      </PylyMdxComponents>
    </>
  );
}

function Header({
  gloss,
  pinyin,
  hanzi,
  onDismiss: _onDismiss,
  ...rest
}: {
  onDismiss?: () => void;
} & Pick<PropsOf<typeof HanziTile>, `gloss` | `hanzi` | `pinyin`>) {
  true satisfies IsExhaustedRest<typeof rest>;

  // Fix some glitchiness when opening the modal by delaying showing the
  // header hanzi tile until after a short timeout.
  const [uiStable, setUiStable] = useState(false);
  useTimeout(() => {
    setUiStable(true);
  }, 250);

  const [ref1, isIntersecting1] = useIntersectionObserver({
    // threshold: 1,
    initialIsIntersecting: true,
  });

  const showHeaderHanziTile = uiStable && !isIntersecting1;

  return (
    <>
      <StickyScrollHeader hanzi={hanzi} show={showHeaderHanziTile} />

      <View className="gap-[10px] pl-4">
        <View
          className={`
            self-start rounded-md border border-lozenge-blue-border bg-lozenge-blue-bg px-2 py-1
          `}
        >
          <Text className="font-sans text-[12px] font-semibold text-lozenge-blue-fg">
            HSK1
          </Text>
        </View>
        <View>
          {/* Scroll detector */}
          <View
            className="h-0 w-full"
            ref={(el) => {
              ref1(el as Element | null);
            }}
          />
          <Text className="font-sans text-[48px] font-semibold text-fg-loud">
            {hanzi}
          </Text>
        </View>
        <View className="gap-1">
          <View>
            <Text className="font-sans text-[16px] text-fg-dim">{pinyin}</Text>
          </View>
          <View className="flex-row gap-2">
            <Text className="font-sans text-[16px] text-fg-loud">{gloss}</Text>
            {/* TODO: make this expand/collapse the definition */}
            {/* <IconImage
              icon="chevron-down-circled"
              size={20}
              className="opacity-50"
            /> */}
          </View>
        </View>
      </View>
    </>
  );
}

function StickyScrollHeader({ hanzi, show }: { hanzi: string; show: boolean }) {
  return (
    <View className="sticky top-0 z-10">
      <View
        className={`sticky top-0 z-10 h-[56px] flex-row content-between items-center bg-bg/90 pl-4`}
      >
        <View className="flex-1 content-center items-center">
          <Text
            className={`
              text-3xl text-fg-loud

              ${show ? `opacity-100 transition-opacity` : `opacity-0`}
            `}
          >
            {hanzi}
          </Text>
        </View>
      </View>
    </View>
  );
}
