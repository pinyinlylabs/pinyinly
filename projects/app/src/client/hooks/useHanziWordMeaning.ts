import type { HanziWord } from "@/data/model";
import { loadDictionary, lookupHanziWord } from "@/dictionary/dictionary";
import { use } from "react";
import { useLocalQuery } from "./useLocalQuery";

export const useHanziWordMeaning = (hanziWord: HanziWord) => {
  return useLocalQuery({
    queryKey: [useHanziWordMeaning.name, hanziWord],
    queryFn: () => lookupHanziWord(hanziWord),
    staleTime: Infinity,
  });
};

export const useHanziWordMeaningSuspense = (hanziWord: HanziWord) => {
  const dict = use(loadDictionary());
  return dict.get(hanziWord) ?? null;
};
