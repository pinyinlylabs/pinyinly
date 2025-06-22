import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type {
  RizzleAnyEntity,
  RizzleBoolean,
  RizzleEntity,
  RizzleEntityInput,
  RizzleEntityMarshaled,
  RizzleEntityOutput,
  RizzleTypeAlias,
} from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";

export type DeviceStorageToggleableEntity = RizzleEntity<
  string,
  { enabled: RizzleBoolean | RizzleTypeAlias<RizzleBoolean> }
>;

export type DeviceStorageEntity = RizzleAnyEntity;
export type DeviceStorageEntityInput<T extends DeviceStorageEntity> =
  RizzleEntityInput<T> | null;
export type DeviceStorageEntityOutput<T extends DeviceStorageEntity> =
  RizzleEntityOutput<T> | null;

const emptySettingKeyParams = {} as const; // stable reference to utilize rizzle's internal memoization
export function buildDeviceStorageKey(key: DeviceStorageEntity): string {
  const storageKey = `hhh.${key.marshalKey(emptySettingKeyParams)}`;

  // SecureStore keys must contain only alphanumeric characters, ".", "-", and
  // "_".
  invariant(/^[a-zA-Z0-9\.\-\_]+$/.test(storageKey));

  return storageKey;
}

export async function deviceStorageGet<T extends DeviceStorageEntity>(
  entity: T,
): Promise<DeviceStorageEntityOutput<T>> {
  const storageKey = buildDeviceStorageKey(entity);
  const storageValue = await deviceStorageGetByStorageKey(storageKey);
  if (storageValue === null) {
    return null;
  }
  try {
    const marshaledValue = JSON.parse(storageValue) as RizzleEntityMarshaled<T>;
    return entity.unmarshalValue(marshaledValue);
  } catch (error) {
    console.error(
      `Failed to parse device storage value at "${storageKey}":`,
      error,
    );
    return null;
  }
}

export async function deviceStorageSet<T extends RizzleAnyEntity>(
  entity: T,
  value: DeviceStorageEntityInput<T>,
): Promise<void> {
  const storageKey = buildDeviceStorageKey(entity);
  if (value === null) {
    await deviceStorageSetByStorageKey(storageKey, null);
  } else {
    const marshaledValue = entity.marshalValue(value);
    const storageValue = JSON.stringify(marshaledValue);
    await deviceStorageSetByStorageKey(storageKey, storageValue);
  }
}

export async function deviceStorageGetByStorageKey(
  storageKey: string,
): Promise<string | null> {
  switch (Platform.OS) {
    case `web`: {
      return localStorage.getItem(storageKey);
    }
    case `ios`:
    case `android`: {
      return await SecureStore.getItemAsync(storageKey);
    }
    case `macos`:
    case `windows`: {
      throw new Error(`unsupported platform ${Platform.OS}`);
    }
  }
}

export async function deviceStorageSetByStorageKey(
  storageKey: string,
  value: string | null,
): Promise<void> {
  switch (Platform.OS) {
    case `web`: {
      if (value === null) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, value);
      }
      break;
    }
    case `ios`:
    case `android`: {
      // eslint-disable-next-line unicorn/prefer-ternary
      if (value === null) {
        await SecureStore.deleteItemAsync(storageKey);
      } else {
        await SecureStore.setItemAsync(storageKey, value);
      }
      break;
    }
    case `macos`:
    case `windows`: {
      throw new Error(`unsupported platform ${Platform.OS}`);
    }
  }
}
