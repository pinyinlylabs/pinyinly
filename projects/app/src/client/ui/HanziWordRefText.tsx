import { useLookupHanziWord } from "@/client/hooks/useLookupHanziWord";
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
  const meaning = useLookupHanziWord(hanziWord);

  let text = ``;

  if (showHanzi) {
    text += hanziFromHanziWord(hanziWord);
  }

  // Convert `gloss: true` into the actual gloss string.
  if (gloss === true && meaning != null && meaning.gloss.length > 0) {
    gloss = glossOrThrow(hanziWord, meaning);
  }

  if (typeof gloss === `string`) {
    const appending = text.length > 0;
    if (appending) {
      text += ` `;
    }
    text += gloss;
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
