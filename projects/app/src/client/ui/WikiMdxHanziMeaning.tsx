import { wikiPayloadQuery } from "@/client/query";
import type { HanziText } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { MdastContent } from "./MdastContent";

export function WikiMdxHanziMeaning({ hanzi }: { hanzi: HanziText }) {
  const { data: wikiPayload } = useQuery(wikiPayloadQuery(hanzi));

  return wikiPayload?.mdast == null ? null : (
    <MdastContent root={wikiPayload.mdast} />
  );
}
