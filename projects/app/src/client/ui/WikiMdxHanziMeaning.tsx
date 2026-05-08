import { wikiMdxQuery } from "@/client/query";
import type { HanziText } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { MdastContent } from "./MdastContent";

export function WikiMdxHanziMeaning({ hanzi }: { hanzi: HanziText }) {
  const { data: root } = useQuery(wikiMdxQuery(hanzi));

  return root == null ? null : <MdastContent root={root} />;
}
