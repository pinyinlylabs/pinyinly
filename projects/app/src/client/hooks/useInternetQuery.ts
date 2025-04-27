import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import {
  // eslint-disable-next-line @expoCodeImports/no-restricted-imports
  useQuery,
} from "@tanstack/react-query";

export function useInternetQuery<
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
    networkMode: `online`,
  });
}
