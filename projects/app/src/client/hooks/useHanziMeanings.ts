import type { HanziText } from "@/data/model";
import { lookupHanzi } from "@/dictionary/dictionary";
import { useLocalQuery } from "./useLocalQuery";

export const useHanziMeanings = (hanzi: HanziText) => {
  return useLocalQuery({
    queryKey: [useHanziMeanings.name, hanzi],
    queryFn: () => lookupHanzi(hanzi),
    staleTime: Infinity,
  });
};
