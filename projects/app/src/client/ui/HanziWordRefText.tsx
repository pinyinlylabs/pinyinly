import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import type { HanziWord } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";
import {
  glossOrThrow,
  hanziFromHanziWord,
  pinyinOrThrow,
} from "@/dictionary/dictionary";
import { useState } from "react";
import { Text } from "react-native";
import { WikiHanziWordModal } from "./WikiHanziWordModal";

export const HanziWordRefText = ({
  hanziWord,
  showHanzi = true,
  showGloss = true,
  showPinyin = false,
}: {
  hanziWord: HanziWord;
  showHanzi?: boolean;
  showGloss?: boolean;
  showPinyin?: boolean;
}) => {
  const meaning = useHanziWordMeaning(hanziWord);
  const [showWiki, setShowWiki] = useState(false);

  let text = ``;

  if (showHanzi) {
    text += hanziFromHanziWord(hanziWord);
  }

  if (showGloss && meaning.data != null && meaning.data.gloss.length > 0) {
    const appending = text.length > 0;
    if (appending) {
      text += ` `;
    }
    text += glossOrThrow(hanziWord, meaning.data);
  }

  if (showPinyin && meaning.data?.pinyin != null) {
    const appending = text.length > 0;
    if (appending) {
      text += ` (`;
    }
    text += pinyinPronunciationDisplayText(
      pinyinOrThrow(hanziWord, meaning.data),
    );
    if (appending) {
      text += `)`;
    }
  }

  return (
    <>
      <Text
        className="hhh-ref"
        onPress={() => {
          setShowWiki(true);
        }}
      >
        {text}
      </Text>
      {showWiki ? (
        <WikiHanziWordModal
          hanziWord={hanziWord}
          onDismiss={() => {
            setShowWiki(false);
          }}
        />
      ) : null}
    </>
  );
};
