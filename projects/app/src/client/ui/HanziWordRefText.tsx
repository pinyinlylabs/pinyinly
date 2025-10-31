import { hanziWordMeaningQuery } from "@/client/query";
import type { HanziWord } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";
import {
  glossOrThrow,
  hanziFromHanziWord,
  pinyinOrThrow,
} from "@/dictionary/dictionary";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HanziWordLink } from "./HanziWordLink";

export const HanziWordRefText = ({
  hanziWord,
  showHanzi = true,
  gloss = true,
  showPinyin = false,
}: {
  hanziWord: HanziWord;
  showHanzi?: boolean;
  /**
   * If `true`, shows the default gloss. If a string, shows that string as the
   * gloss. If `false`, no gloss is shown.
   */
  gloss?: boolean | string;
  showPinyin?: boolean;
}) => {
  const { data: meaning } = useSuspenseQuery(hanziWordMeaningQuery(hanziWord));

  let text = ``;

  if (showHanzi) {
    text += hanziFromHanziWord(hanziWord);
  }

  if (
    gloss !== false &&
    (typeof gloss === `string` || (meaning != null && meaning.gloss.length > 0))
  ) {
    const appending = text.length > 0;
    if (appending) {
      text += ` `;
    }
    text +=
      typeof gloss === `string` ? gloss : glossOrThrow(hanziWord, meaning);
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
