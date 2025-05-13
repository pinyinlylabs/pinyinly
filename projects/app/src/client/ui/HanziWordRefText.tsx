import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import type { HanziWord } from "@/data/model";
import {
  glossOrThrow,
  hanziFromHanziWord,
  pinyinOrThrow,
} from "@/dictionary/dictionary";
import { lazy, Suspense, useState } from "react";
import { Text } from "react-native";
import { tv } from "tailwind-variants";
import type { HhhmarkContext } from "./Hhhmark";

export const hhhTextRef = tv({
  variants: {
    context: {
      [`body-2xl`]: `hhh-text-body-2xl-ref`,
      body: `hhh-text-body-ref`,
      caption: `hhh-text-caption-ref`,
    },
  },
});

const WikiHanziWordModal = lazy(() => import(`./WikiHanziWordModal`));

export const HanziWordRefText = ({
  hanziWord,
  showGloss = true,
  showPinyin = false,
  context,
}: {
  hanziWord: HanziWord;
  showGloss?: boolean;
  showPinyin?: boolean;
  context: HhhmarkContext;
}) => {
  const meaning = useHanziWordMeaning(hanziWord);
  const [showWiki, setShowWiki] = useState(false);

  let infoText = ``;

  if (showGloss && meaning.data != null && meaning.data.gloss.length > 0) {
    infoText += ` ${glossOrThrow(hanziWord, meaning.data)}`;
  }

  if (showPinyin && meaning.data?.pinyin != null) {
    infoText += ` (${pinyinOrThrow(hanziWord, meaning.data)})`;
  }

  return (
    <>
      <Text
        className={hhhTextRef({ context })}
        onPress={() => {
          setShowWiki(true);
        }}
      >
        {`${hanziFromHanziWord(hanziWord)}${infoText}`}
      </Text>
      {showWiki ? (
        <Suspense fallback={null}>
          <WikiHanziWordModal
            hanziWord={hanziWord}
            onDismiss={() => {
              setShowWiki(false);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
};
