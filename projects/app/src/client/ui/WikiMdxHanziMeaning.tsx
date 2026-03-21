import { getWikiMdxHanziMeaning } from "@/client/wiki";
import type { HanziText } from "@/data/model";

export function WikiMdxHanziMeaning({ hanzi }: { hanzi: HanziText }) {
  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);
  return MeaningMdx == null ? null : (
    // oxlint-disable-next-line react-hooks-js/static-components
    <MeaningMdx />
  );
}
