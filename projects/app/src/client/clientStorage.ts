import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore keys must contain only alphanumeric characters, ".", "-", and
// "_", so the separator is `.`
const QUERY_KEY_PREFIX = `hhh.`;

export function getClientStorageKey(key: string): string {
  return `${QUERY_KEY_PREFIX}${key}`;
}

export async function clientStorageGet(key: string): Promise<string | null> {
  const storageKey = getClientStorageKey(key);

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

export async function clientStorageSet(
  key: string,
  value: string | null,
): Promise<void> {
  const storageKey = getClientStorageKey(key);

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
