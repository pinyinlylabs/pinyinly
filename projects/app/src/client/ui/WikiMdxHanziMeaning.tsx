import { getWikiMdxHanziMeaning } from "@/client/wiki";
import type { HanziText } from "@/data/model";

export function WikiMdxHanziMeaning({ hanzi }: { hanzi: HanziText }) {
  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);
  // oxlint-disable-next-line react-hooks-js/static-components
  return MeaningMdx == null ? null : <MeaningMdx />;
}
