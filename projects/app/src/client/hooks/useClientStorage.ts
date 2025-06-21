import {
  clientStorageGet,
  clientStorageSet,
  getClientStorageKey,
} from "@/client/clientStorage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocalQuery } from "./useLocalQuery";
import { windowEventListenerEffect } from "./windowEventListenerEffect";

/**
 * @param storageKey Using the prefixed key ("storageKey") as the query key (as
 * opposed to the unprefixed key) makes it simpler to synchronise
 * @returns
 */
function getQueryKey(storageKey: string): readonly string[] {
  return [`clientStorage`, storageKey];
}

/**
 * react-query wrapper around localStorage (web) and SecureStore (ios +
 * android). See {@link useClientStorageMutation}.
 */
export const useClientStorageQuery = (key: string) => {
  const queryClient = useQueryClient();
  const storageKey = getClientStorageKey(key);
  const queryKey = getQueryKey(storageKey);

  // Synchronise localStorage changes from other browser tabs.
  useEffect(
    () =>
      windowEventListenerEffect(`storage`, (event) => {
        if (event.storageArea === localStorage && event.key === storageKey) {
          queryClient.setQueryData(queryKey, event.newValue);
        }
      }),
    [key, queryClient, storageKey, queryKey],
  );

  return useLocalQuery({
    queryKey,
    queryFn: () => clientStorageGet(key),
  });
};

/**
 * Set a value (string), or null to delete the item.
 */
export const useClientStorageMutation = (key: string) => {
  const queryClient = useQueryClient();
  const storageKey = getClientStorageKey(key);

  return useMutation({
    mutationFn: async (value: string | null) => {
      await clientStorageSet(key, value);

      // Passes through to `onSuccess`.
      return value;
    },
    onSuccess: async (data) => {
      const queryKey = getQueryKey(storageKey);

      if (data === null) {
        await queryClient.invalidateQueries({
          queryKey,
        });
      } else {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
};
