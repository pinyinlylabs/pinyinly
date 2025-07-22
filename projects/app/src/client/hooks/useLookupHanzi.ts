import type { HanziText } from "@/data/model";
import type { HanziWordWithMeaning } from "@/dictionary/dictionary";
import { hanziToHanziWordMap } from "@/dictionary/dictionary";
import { emptyArray } from "@/util/collections";
import { use } from "react";
import type { DeepReadonly } from "ts-essentials";

export const useLookupHanzi = (
  hanzi: HanziText,
): DeepReadonly<HanziWordWithMeaning[]> => {
  const { hanziMap } = use(hanziToHanziWordMap());
  return hanziMap.get(hanzi) ?? emptyArray;
};
