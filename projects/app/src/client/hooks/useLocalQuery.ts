import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import {
  // eslint-disable-next-line @typescript-eslint/no-restricted-imports
  useQuery,
} from "@tanstack/react-query";

export function useLocalQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = [],
>(
  options: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    `networkMode`
  >,
): UseQueryResult<TData, TError> {
  return useQuery({
    ...options,
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });
}
