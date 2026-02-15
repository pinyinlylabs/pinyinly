import type { Rizzle } from "@/data/rizzleSchema";
import type { ReactQueryValue } from "@pinyinly/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { ReadTransaction } from "replicache";
import { useRizzle } from "./useRizzle";

// Work around the exhaustive-deps lint rule.
const useMemoUnsafe = useMemo;

export type UseRizzleQueryFn<T extends ReactQueryValue> = (
  r: Rizzle,
  tx: ReadTransaction,
) => Promise<T>;

export function useRizzleQuery<T extends ReactQueryValue>(
  key: QueryKey,
  query: UseRizzleQueryFn<T>,
) {
  const queryClient = useQueryClient();
  const r = useRizzle();

  // Improve debugging.
  // useRenderGuard(useRizzleQuery.name);

  // The reference for `key` usually changes on every render because the array
  // is written inline and changes on every render.

  const stableKey = useMemoUnsafe(() => key, key);

  // The reference for `query` usually changes on every render because the
  // function is written inline and the reference changes.

  const stableQuery = useMemoUnsafe(() => query, stableKey);

  useEffect(() => {
    const unsubscribe = r.replicache.subscribe(
      async (tx) => stableQuery(r, tx),
      {
        onData: (data) => {
          queryClient.setQueryData(stableKey, data);
        },
        onError: (e) => {
          console.error(e);
        },
      },
    );

    return () => {
      unsubscribe();
    };
  }, [stableKey, stableQuery, queryClient, r]);

  const result = useQuery({
    queryKey: key,
    queryFn: async () => r.replicache.query(async (tx) => query(r, tx)),
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

  return result;
}
