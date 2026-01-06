import { getWikiMdxHanziMeaning } from "@/client/wiki";
import type { HanziText } from "@/data/model";
import { loadDictionary } from "@/dictionary";
import type { IsExhaustedRest, PropsOf } from "@pinyinly/lib/types";
import { use, useState } from "react";
import { Text, View } from "react-native";
import { useIntersectionObserver, useTimeout } from "usehooks-ts";
import { HanziTile } from "./HanziTile";
import { PylyMdxComponents } from "./PylyMdxComponents";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi);

  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);

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
        variant={hanziWordMeanings.length === 1 ? `filled` : `outline`}
      />

      <PylyMdxComponents>
        <View className="flex-1 gap-6 bg-bg py-7">
          {MeaningMdx == null ? null : <MeaningMdx />}
        </View>
      </PylyMdxComponents>
    </>
  );
}

function Header({
  gloss,
  pinyin,
  hanzi,
  onDismiss,
  variant,
  ...rest
}: {
  onDismiss?: () => void;
} & Pick<PropsOf<typeof HanziTile>, `gloss` | `hanzi` | `pinyin` | `variant`>) {
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
      <View className="sticky top-0 z-10">
        <View
          className={`
            sticky top-0 z-10 h-[56px] flex-row content-between items-center bg-bg/90 pl-4
          `}
        >
          <View className="flex-1 content-center items-center">
            <Text
              className={`
                text-3xl text-fg-loud

                ${showHeaderHanziTile ? `opacity-100 transition-opacity` : `opacity-0`}
              `}
            >
              {hanzi}
            </Text>
          </View>
        </View>
      </View>

      <View className="items-center">
        <HanziTile
          hanzi={hanzi}
          pinyin={pinyin}
          gloss={gloss}
          className="place-self-center"
          variant={variant}
          size="47"
        />
      </View>
      {/* Scroll detector */}
      <View
        className="h-0 w-full"
        ref={(el) => {
          ref1(el as Element | null);
        }}
      />
    </>
  );
}
