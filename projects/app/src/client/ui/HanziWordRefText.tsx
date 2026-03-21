import type { HanziWord } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { HanziWordLink } from "./HanziWordLink";
import { useDb } from "./hooks/useDb";

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
  const db = useDb();
  const { data: meaning } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanziWord, hanziWord))
        .select(({ entry }) => ({ gloss: entry.gloss, pinyin: entry.pinyin }))
        .findOne(),
    [db.dictionarySearch, hanziWord],
  );

  let text = ``;

  if (showHanzi) {
    text += hanziFromHanziWord(hanziWord);
  }

  // Convert `gloss: true` into the actual gloss string.
  if (gloss === true && meaning != null && meaning.gloss.length > 0) {
    gloss = meaning.gloss[0] ?? false;
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
    text += meaning.pinyin[0] ?? ``;
    if (appending) {
      text += `)`;
    }
  }

  return <HanziWordLink hanziWord={hanziWord}>{text}</HanziWordLink>;
};
