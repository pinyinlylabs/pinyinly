import type { HanziWord } from "@/data/model";
import { loadDictionary } from "@/dictionary/dictionary";
import { use } from "react";

export const useLookupHanziWord = (hanziWord: HanziWord) => {
  const dictionary = use(loadDictionary());
  return dictionary.get(hanziWord);
};
