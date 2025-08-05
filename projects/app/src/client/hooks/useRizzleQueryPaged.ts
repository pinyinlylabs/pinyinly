import type { Rizzle } from "@/data/rizzleSchema";
import type { ReactQueryValue } from "@pinyinly/lib/types";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocalQuery } from "../hooks/useLocalQuery";
import { useRenderGuard } from "../hooks/useRenderGuard";
import { useReplicache } from "./useReplicache";

export function useRizzleQueryPaged<T extends ReactQueryValue>(
  key: QueryKey,
  query: (r: Rizzle) => Promise<T>,
  watchPrefixes?: string[],
) {
  const r = useReplicache();
  const queryClient = useQueryClient();

  // Improve debugging.
  useRenderGuard(useRizzleQueryPaged.name);

  const watchPrefixesCsv = watchPrefixes?.join(`,`) ?? ``;

  useEffect(() => {
    const onStoreChange = () => {
      queryClient
        .invalidateQueries({ queryKey: key })
        .catch((error: unknown) => {
          console.error(`Error invalidating query ${key.join(`, `)}:`, error);
        });
    };

    const prefixes = watchPrefixesCsv.split(`,`);
    const unsubscribes = prefixes.map((prefix) =>
      r.replicache.experimentalWatch(
        () => {
          onStoreChange();
        },
        { prefix },
      ),
    );

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }, [key, queryClient, r.replicache, watchPrefixesCsv]);

  const result = useLocalQuery({
    queryKey: key,
    queryFn: () => query(r),
    // TODO: enable these after adding subscribing to replicache mutations and
    // invalidating the cache.
    //
    // refetchOnReconnect: false,
    // refetchOnWindowFocus: false,
    // refetchOnMount: false,
  });

  return result;
}
