import type {
  DeviceStoreEntity,
  DeviceStoreEntityInput,
  DeviceStoreEntityOutput,
} from "@/client/deviceStore";
import { buildDeviceStoreKey, deviceStoreSet } from "@/client/deviceStore";
import { deviceStoreQuery } from "@/client/query";
import { DeviceStoreProvider } from "@/client/ui/DeviceStoreProvider";
import type { RizzleEntityInput, RizzleEntityMarshaled } from "@/util/rizzle";
import { nonNullable } from "@pinyinly/lib/invariant";
import { useMutation, useQuery } from "@tanstack/react-query";
import { use, useEffect } from "react";
import { windowEventListenerEffect } from "./windowEventListenerEffect";

/**
 * react-query wrapper around localStorage (web) and SecureStore (ios +
 * android). See {@link useDeviceStoreMutation}.
 */
export const useDeviceStoreQuery = (key: DeviceStoreEntity) => {
  const queryClient = useDeviceStoreQueryClient();
  const query = deviceStoreQuery(key);
  const storageKey = buildDeviceStoreKey(key);

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
                  ) as RizzleEntityMarshaled<DeviceStoreEntity>);

            const newValue =
              marshaledValue == null
                ? null
                : key.unmarshalValue(marshaledValue);

            queryClient.setQueryData(query.queryKey, newValue);
          } catch (error) {
            console.error(
              `Failed to parse device store change event value at "${storageKey}":`,
              error,
            );
          }
        }
      }),
    [key, queryClient, storageKey, query.queryKey],
  );

  return useQuery(query, queryClient);
};

/**
 * Update a storage item. `null` will delete the item, any other value will be
 * marshaled and saved.
 */
export const useDeviceStoreMutation = <T extends DeviceStoreEntity>(key: T) => {
  const queryClient = useDeviceStoreQueryClient();
  const query = deviceStoreQuery(key);

  return useMutation(
    {
      mutationFn: async (value: RizzleEntityInput<T> | null) => {
        await deviceStoreSet(key, value);

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
        const { queryKey } = query;

        if (data === null) {
          await queryClient.invalidateQueries({ queryKey });
        } else {
          queryClient.setQueryData(queryKey, data);
        }
      },
    },
    queryClient,
  );
};

export interface UseDeviceStoreResult<T extends DeviceStoreEntity> {
  isLoading: boolean;
  value: DeviceStoreEntityOutput<T>;
  setValue: UseDeviceStoreSetValue<T>;
}

export type UseDeviceStoreSetValue<T extends DeviceStoreEntity> = (
  value: DeviceStoreEntityInput<T> | UseDeviceStoreUpdateFn<T>,
) => void;

export type UseDeviceStoreUpdateFn<T extends DeviceStoreEntity> = (
  prev: DeviceStoreEntityOutput<T>,
  isLoading: boolean,
) => DeviceStoreEntityInput<T>;

export const useDeviceStore = <T extends DeviceStoreEntity>(
  setting: T,
): UseDeviceStoreResult<T> => {
  const result = useDeviceStoreQuery(setting);
  const mutate = useDeviceStoreMutation(setting);

  const isLoading = result.isPending;
  const value = result.data ?? null;

  const setValue: UseDeviceStoreSetValue<T> = (updater) => {
    if (typeof updater === `function`) {
      updater = updater(value, isLoading);
    }
    mutate.mutate(updater);
  };

  return { isLoading, value, setValue };
};

function useDeviceStoreQueryClient() {
  const ctx = nonNullable(
    use(DeviceStoreProvider.Context),
    `useDeviceStoreQuery must be used within a DeviceStoreProvider`,
  );
  return ctx.queryClient;
}
