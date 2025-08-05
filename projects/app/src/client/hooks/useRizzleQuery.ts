import type { Rizzle } from "@/data/rizzleSchema";
import type { ReactQueryValue } from "@pinyinly/lib/types";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { ReadTransaction } from "replicache";
import { useLocalQuery } from "../hooks/useLocalQuery";
import { useRenderGuard } from "../hooks/useRenderGuard";
import { useReplicache } from "./useReplicache";

export type UseRizzleQueryFn<T extends ReactQueryValue> = (
  r: Rizzle,
  tx: ReadTransaction,
) => Promise<T>;

export function useRizzleQuery<T extends ReactQueryValue>(
  key: QueryKey,
  query: UseRizzleQueryFn<T>,
) {
  "use no memo";
  const queryClient = useQueryClient();
  const r = useReplicache();

  // Improve debugging.
  useRenderGuard(useRizzleQuery.name);

  // The reference for `key` usually changes on every render because the array
  // is written inline and changes on every render.
  //
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableKey = useMemo(() => key, key);

  // The reference for `query` usually changes on every render because the
  // function is written inline and the reference changes.
  //
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableQuery = useMemo(() => query, stableKey);

  useEffect(() => {
    const unsubscribe = r.replicache.subscribe((tx) => stableQuery(r, tx), {
      onData: (data) => {
        queryClient.setQueryData(stableKey, data);
      },
      onError: (e) => {
        console.error(e);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [stableKey, stableQuery, queryClient, r]);

  const result = useLocalQuery({
    queryKey: key,
    queryFn: () => r.replicache.query((tx) => query(r, tx)),
  });

  return result;
}
