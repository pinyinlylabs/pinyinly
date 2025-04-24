import type { HanziWord } from "@/data/model";
import { lookupHanziWord } from "@/dictionary/dictionary";
import { useLocalQuery } from "./useLocalQuery";

export const useHanziWordMeaning = (hanziWord: HanziWord) => {
  return useLocalQuery({
    queryKey: [useHanziWordMeaning.name, hanziWord],
    queryFn: () => lookupHanziWord(hanziWord),
    staleTime: Infinity,
  });
};
