import type { HanziWord } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import type { PropsWithChildren } from "react";
import { HanziLink } from "./HanziLink";

export const HanziWordLink = ({
  hanziWord,
  children,
}: PropsWithChildren<{
  hanziWord: HanziWord;
}>) => {
  const hanzi = hanziFromHanziWord(hanziWord);

  return <HanziLink hanzi={hanzi}>{children}</HanziLink>;
};
