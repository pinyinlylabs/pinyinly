import type { HanziText } from "@/data/model";
import { lookupHanziWikiEntry } from "@/dictionary/dictionary";
import { useLocalQuery } from "./useLocalQuery";

export const useHanziWikiEntry = (hanzi: HanziText) => {
  return useLocalQuery({
    queryKey: [useHanziWikiEntry.name, hanzi],
    queryFn: () => lookupHanziWikiEntry(hanzi),
    staleTime: Infinity,
  });
};
