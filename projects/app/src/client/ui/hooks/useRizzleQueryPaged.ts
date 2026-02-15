import type { WithRizzleWatchPrefixes } from "@/client/query";
import { useRenderGuard } from "@/client/ui/hooks/useRenderGuard";
import type { ReactQueryValue } from "@pinyinly/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DefaultError,
  QueryKey,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { useRizzle } from "./useRizzle";

export function useRizzleQueryPaged<
  TQueryFnData = ReactQueryValue,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: WithRizzleWatchPrefixes<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
  >,
) {
  const r = useRizzle();
  const queryClient = useQueryClient();

  // Improve debugging.
  useRenderGuard(
    `useRizzleQueryPaged` satisfies HasNameOf<typeof useRizzleQueryPaged>,
  );

  if (options.networkMode !== `offlineFirst`) {
    console.warn(
      `useRizzleQueryPaged query passed a query with unexpected networkMode: ${options.networkMode ?? `<undefined>`}` satisfies HasNameOf<
        typeof useRizzleQueryPaged
      >,
    );
  }

  // TODO: the default will cause all prefixes to be watched, is that
  // intentional?
  const watchPrefixesCsv = options.rizzleWatchPrefixes?.join(`,`) ?? ``;

  useEffect(() => {
    const onStoreChange = () => {
      queryClient
        .invalidateQueries({ queryKey: options.queryKey })
        .catch((error: unknown) => {
          console.error(
            `Error invalidating query ${options.queryKey.join(`, `)}:`,
            error,
          );
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
  }, [options.queryKey, queryClient, r.replicache, watchPrefixesCsv]);

  return useQuery(options);
}
