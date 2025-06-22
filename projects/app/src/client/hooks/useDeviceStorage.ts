import type {
  DeviceStorageEntity,
  DeviceStorageEntityInput,
  DeviceStorageEntityOutput,
} from "@/client/deviceStorage";
import {
  buildDeviceStorageKey,
  deviceStorageGet,
  deviceStorageSet,
} from "@/client/deviceStorage";
import type { RizzleEntityInput, RizzleEntityMarshaled } from "@/util/rizzle";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocalQuery } from "./useLocalQuery";
import { windowEventListenerEffect } from "./windowEventListenerEffect";

/**
 * Computes a react-query cache key given a device storage key.
 */
function getQueryKey(storageKey: string): readonly string[] {
  return [`DeviceStorage`, storageKey];
}

/**
 * react-query wrapper around localStorage (web) and SecureStore (ios +
 * android). See {@link useDeviceStorageMutation}.
 */
export const useDeviceStorageQuery = (key: DeviceStorageEntity) => {
  const queryClient = useQueryClient();
  const storageKey = buildDeviceStorageKey(key);
  const queryKey = getQueryKey(storageKey);

  // Synchronise localStorage changes from other browser tabs.
  useEffect(
    () =>
      windowEventListenerEffect(`storage`, (event) => {
        if (event.storageArea === localStorage && event.key === storageKey) {
          try {
            const marshaledValue =
              event.newValue == null
                ? null
                : (JSON.parse(
                    event.newValue,
                  ) as RizzleEntityMarshaled<DeviceStorageEntity>);

            const newValue =
              marshaledValue == null
                ? null
                : key.unmarshalValue(marshaledValue);

            queryClient.setQueryData(queryKey, newValue);
          } catch (error) {
            console.error(
              `Failed to parse device storage change event value at "${storageKey}":`,
              error,
            );
          }
        }
      }),
    [key, queryClient, storageKey, queryKey],
  );

  return useLocalQuery({
    queryKey,
    queryFn: () => deviceStorageGet(key),
  });
};

/**
 * Update a storage item. `null` will delete the item, any other value will be
 * marshaled and saved.
 */
export const useDeviceStorageMutation = <T extends DeviceStorageEntity>(
  key: T,
) => {
  const queryClient = useQueryClient();
  const storageKey = buildDeviceStorageKey(key);

  return useMutation({
    mutationFn: async (value: RizzleEntityInput<T> | null) => {
      await deviceStorageSet(key, value);

      const roundTrippedValue =
        value == null
          ? null
          : // Need to round-trip the value because inputs can be broader than
            // outputs, so this normalises to the output.
            key.unmarshalValue(key.marshalValue(value));

      // Returning a value here causes it to be passed as an argument to
      // `onSuccess`.
      return roundTrippedValue;
    },
    onSuccess: async (data) => {
      const queryKey = getQueryKey(storageKey);

      if (data === null) {
        await queryClient.invalidateQueries({ queryKey });
      } else {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
};

export const UseDeviceStorageLoadingSymbol = Symbol(`DeviceStorageLoading`);

export type UseDeviceStorageValue<T extends DeviceStorageEntity> =
  | DeviceStorageEntityOutput<T>
  | typeof UseDeviceStorageLoadingSymbol;

export interface UseDeviceStorageResult<T extends DeviceStorageEntity> {
  isLoading: boolean;
  value: DeviceStorageEntityOutput<T>;
  setValue: UseDeviceStorageSetValue<T>;
}

export type UseDeviceStorageSetValue<T extends DeviceStorageEntity> = (
  value: DeviceStorageEntityInput<T> | UseDeviceStorageUpdateFn<T>,
) => void;

export type UseDeviceStorageUpdateFn<T extends DeviceStorageEntity> = (
  prev: DeviceStorageEntityOutput<T>,
  isLoading: boolean,
) => DeviceStorageEntityInput<T>;

export const useDeviceStorage = <T extends DeviceStorageEntity>(
  setting: T,
): UseDeviceStorageResult<T> => {
  const result = useDeviceStorageQuery(setting);
  const mutate = useDeviceStorageMutation(setting);

  const isLoading = result.isPending;
  const value = result.data ?? null;

  const setValue: UseDeviceStorageSetValue<T> = (updater) => {
    if (typeof updater === `function`) {
      updater = updater(value, isLoading);
    }
    mutate.mutate(updater);
  };

  return { isLoading, value, setValue };
};
