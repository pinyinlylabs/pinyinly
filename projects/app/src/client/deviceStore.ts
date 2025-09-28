import type {
  RizzleAnyEntity,
  RizzleBoolean,
  RizzleEntity,
  RizzleEntityInput,
  RizzleEntityMarshaled,
  RizzleEntityOutput,
  RizzleTypeAlias,
} from "@/util/rizzle";
import { invariant } from "@pinyinly/lib/invariant";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type DeviceStoreToggleableEntity = RizzleEntity<
  string,
  { enabled: RizzleBoolean | RizzleTypeAlias<RizzleBoolean> }
>;

export type DeviceStoreEntity = RizzleAnyEntity;
export type DeviceStoreEntityInput<T extends DeviceStoreEntity> =
  RizzleEntityInput<T> | null;
export type DeviceStoreEntityOutput<T extends DeviceStoreEntity> =
  RizzleEntityOutput<T> | null;

const emptySettingKeyParams = {} as const; // stable reference to utilize rizzle's internal memoization
export function buildDeviceStoreKey(key: DeviceStoreEntity): string {
  const storageKey = `hhh.${key.marshalKey(emptySettingKeyParams)}`;

  // SecureStore keys must contain only alphanumeric characters, ".", "-", and
  // "_".
  invariant(/^[a-zA-Z0-9\.\-\_]+$/.test(storageKey));

  return storageKey;
}

export async function deviceStoreGet<T extends DeviceStoreEntity>(
  entity: T,
): Promise<DeviceStoreEntityOutput<T>> {
  const storageKey = buildDeviceStoreKey(entity);
  const storageValue = await deviceStoreGetByStorageKey(storageKey);
  if (storageValue === null) {
    return null;
  }
  try {
    const marshaledValue = JSON.parse(storageValue) as RizzleEntityMarshaled<T>;
    return entity.unmarshalValue(marshaledValue);
  } catch (error) {
    console.error(
      `Failed to parse device store value at "${storageKey}":`,
      error,
    );
    return null;
  }
}

export async function deviceStoreSet<T extends RizzleAnyEntity>(
  entity: T,
  value: DeviceStoreEntityInput<T>,
): Promise<void> {
  const storageKey = buildDeviceStoreKey(entity);
  if (value === null) {
    await deviceStoreSetByStorageKey(storageKey, null);
  } else {
    const marshaledValue = entity.marshalValue(value);
    const storageValue = JSON.stringify(marshaledValue);
    await deviceStoreSetByStorageKey(storageKey, storageValue);
  }
}

export async function deviceStoreGetByStorageKey(
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

export async function deviceStoreSetByStorageKey(
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
