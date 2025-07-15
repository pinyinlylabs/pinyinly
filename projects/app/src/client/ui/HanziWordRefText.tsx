import { useHanziWordMeaningSuspense } from "@/client/hooks/useHanziWordMeaning";
import type { HanziWord } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";
import {
  glossOrThrow,
  hanziFromHanziWord,
  pinyinOrThrow,
} from "@/dictionary/dictionary";
import { HanziWordLink } from "./HanziWordLink";

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
  const meaning = useHanziWordMeaningSuspense(hanziWord);

  let text = ``;

  if (showHanzi) {
    text += hanziFromHanziWord(hanziWord);
  }

  if (showGloss && meaning != null && meaning.gloss.length > 0) {
    const appending = text.length > 0;
    if (appending) {
      text += ` `;
    }
    text += glossOrThrow(hanziWord, meaning);
  }

  if (showPinyin && meaning?.pinyin != null) {
    const appending = text.length > 0;
    if (appending) {
      text += ` (`;
    }
    text += pinyinPronunciationDisplayText(pinyinOrThrow(hanziWord, meaning));
    if (appending) {
      text += `)`;
    }
  }

  return <HanziWordLink hanziWord={hanziWord}>{text}</HanziWordLink>;
};
