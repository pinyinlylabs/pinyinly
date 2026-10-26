import {
  hanziSvgPathsQuery,
  skipQuery,
  wikiPayloadQuery,
} from "@/client/query";
import type { WikiPayload } from "@/client/query";
import type { HanziCharacter } from "@/data/model";
import type { SimilarCharacterReference } from "@/data/questions/hanziCharacterWriting";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import { useQueries, useQuery } from "@tanstack/react-query";

export function useVisuallySimilarCharacterReferences(
  character: HanziCharacter | null,
) {
  const wikiQuery = useQuery(
    character == null
      ? skipQuery<WikiPayload | null>()
      : wikiPayloadQuery(character),
  );
  const visuallySimilar = wikiQuery.data?.visuallySimilar ?? [];
  const similarCharacterQueries = useQueries({
    queries: visuallySimilar.map((hanzi) => hanziSvgPathsQuery(hanzi)),
  });
  const references: SimilarCharacterReference[] = visuallySimilar.flatMap(
    (hanzi, index) => {
      const medians = similarCharacterQueries[index]?.data?.medians;
      return medians == null || medians.length === 0
        ? []
        : [
            {
              hanzi,
              medianPaths: medians.map(transformArphicSpaceSvgPath),
            },
          ];
    },
  );
  const missingCharacter = visuallySimilar.find((_, index) => {
    const query = similarCharacterQueries[index];
    return (
      query == null ||
      query.isError ||
      query.data?.medians == null ||
      query.data.medians.length === 0
    );
  });

  return {
    references,
    isLoading:
      wikiQuery.isLoading ||
      similarCharacterQueries.some((query) => query.isLoading),
    hasWikiError: wikiQuery.isError,
    missingCharacter,
  };
}
