import type { HanziWord } from "@/data/model";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { use } from "react";
import type { HanziTileProps } from "./HanziTile";
import { HanziTile } from "./HanziTile";

export function HanziWordTile({
  hanziWord,
  className = ``,
  variant,
  size,
}: {
  hanziWord: HanziWord;
} & Pick<HanziTileProps, `className` | `variant` | `size`>) {
  const hanzi = hanziFromHanziWord(hanziWord);
  const dictionary = use(loadDictionary());
  const meaning = dictionary.lookupHanziWord(hanziWord);

  return (
    <HanziTile
      className={className}
      gloss={meaning?.gloss[0]}
      hanzi={hanzi}
      pinyin={meaning?.pinyin?.[0]?.join(` `)}
      size={size}
      variant={variant}
    />
  );
}
