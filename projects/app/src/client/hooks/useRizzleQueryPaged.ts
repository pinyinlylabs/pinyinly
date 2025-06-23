import type { Rizzle } from "@/data/rizzleSchema";
import type { ReactQueryValue } from "@/util/types";
import type { QueryKey } from "@tanstack/react-query";
import { useLocalQuery } from "../hooks/useLocalQuery";
import { useRenderGuard } from "../hooks/useRenderGuard";
import { useReplicache } from "./useReplicache";

export function useRizzleQueryPaged<T extends ReactQueryValue>(
  key: QueryKey,
  query: (r: Rizzle) => Promise<T>,
) {
  const r = useReplicache();

  // Improve debugging.
  useRenderGuard(useRizzleQueryPaged.name);

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
