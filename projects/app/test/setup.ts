import type { IconRegistry } from "#client/ui/iconRegistry.js";
import { format } from "@pinyinly/lib/jsonfmt";
import * as matchers from "@testing-library/jest-dom/matchers";
import * as fs from "@pinyinly/lib/fs";
import type { Component } from "react";
import { createElement, Fragment } from "react";
import { View } from "react-native-web";
import { expect, vi } from "vitest";
import isEqual from "lodash/isEqual";

expect.extend(matchers);

expect.extend({
  async toMatchJsonFileSnapshot(received: unknown, filePath: string) {
    if (typeof received !== `object` || received == null) {
      return {
        pass: false,
        message: () =>
          `toMatchJsonFileSnapshot expected an object or array, but received ${typeof received}`,
      };
    }

    const expected = await format(filePath, JSON.stringify(received));

    const current = (await fs.stat(filePath)).isFile()
      ? (JSON.parse(
          await fs.readFile(filePath, { encoding: `utf-8` }),
        ) as unknown)
      : null;

    if (!isEqual(received, current)) {
      await expect(expected, `File: ${filePath}`).toMatchFileSnapshot(filePath);
    }

    return {
      pass: true,
      message: () => `expected JSON to match file snapshot at "${filePath}"`,
    };
  },
});

// Mock expo-audio to avoid pulling in native modules, avoids:
//
// ```
// TypeError: Cannot read properties of undefined (reading 'NativeModule')
//  ❯ ../../node_modules/expo-modules-core/src/NativeModule.ts:8:32
//       6| ensureNativeModulesAreInstalled();
//       7|
//       8| export default globalThis.expo.NativeModule as typeof NativeModule;
//        |                                ^
//       9|
//  ❯ ../../node_modules/expo-modules-core/src/index.ts:7:1
// ```
vi.mock(`expo-audio`, () => {
  return {};
});

vi.mock(`expo`, () => {
  class NativeModule {}

  return {
    NativeModule,
    isRunningInExpoGo: () => false,
    registerWebModule: () => null,
    requireNativeModule: () => ({}),
    requireOptionalNativeModule: () => ({}),
  };
});

vi.mock(`expo-crypto`, async () => {
  const nodeCrypto = await import(`node:crypto`);

  function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  }

  return {
    CryptoDigestAlgorithm: {
      SHA1: `SHA1`,
      SHA256: `SHA256`,
      SHA384: `SHA384`,
      SHA512: `SHA512`,
    },
    async digest(algorithm: string, data: string | ArrayBuffer) {
      const hash = nodeCrypto.createHash(algorithm.toLowerCase());
      hash.update(typeof data === `string` ? data : Buffer.from(data));
      return toArrayBuffer(hash.digest());
    },
    async digestStringAsync(algorithm: string, data: string) {
      const hash = nodeCrypto.createHash(algorithm.toLowerCase());
      hash.update(data);
      return hash.digest(`hex`);
    },
    getRandomValues<T extends ArrayBufferView>(array: T) {
      return nodeCrypto.randomFillSync(array as unknown as Uint8Array);
    },
    randomUUID: () => nodeCrypto.randomUUID(),
  };
});

vi.mock(`expo-updates`, () => {
  return {
    updateId: null,
    isEmbeddedLaunch: false,
    manifest: {},
  };
});

// Mock react-native to use react-native-web otherwise Node will try to import
// Flow type files and fail.
vi.mock(`react-native`, async () => {
  return {
    ...(await vi.importActual(`react-native-web`)),
  };
});

// Mock rive-react-native to avoid pulling in native modules.
vi.mock(`rive-react-native`, () => {
  return {};
});

vi.mock(`expo-haptics`, () => {
  return {};
});

vi.mock(`expo-image`, () => {
  return {
    // SyntaxError: The requested module 'expo-image' does not provide an export
    // named 'Image'
    Image: () => null,
  };
});

vi.mock(import(`#client/ui/iconRegistry.ts`), () => {
  return {
    iconRegistry: {} as IconRegistry,
    iconNames: [],
  };
});

vi.mock(`expo-router`, () => {
  return {
    // SyntaxError: Unexpected token '<'
    //  ❯ Object.<anonymous> ../../node_modules/expo-router/src/layouts/Stack.tsx:1:1
    Link: ({ children }: { children: React.ReactNode }) =>
      createElement(Fragment, null, children),
  };
});

vi.mock(`react-native-svg`, () => {
  return {
    // SyntaxError: Unexpected token 'typeof'
    G: () => null,
    Path: () => null,
    Svg: () => null,
  };
});

vi.mock(`react-native-reanimated`, () => {
  return {
    useSharedValue: () => null,
    useAnimatedStyle: () => ({}),
    withDelay: null,
    withSpring: null,
    withTiming: null,
    Easing: null,
    Extrapolation: null,
    interpolate: null,
    interpolateColor: null,
    default: {
      createAnimatedComponent: (x: Component) => x,
      View,
    },
  };
});

vi.mock(`expo-image-picker`, () => {
  return {
    launchImageLibraryAsync: () => null,
    requestMediaLibraryPermissionsAsync: () => null,
  };
});

vi.mock(`uniwind`, () => {
  return {
    withUniwind: (x: Component) => x,
  };
});

vi.mock(`@floating-ui/react-native`, () => {
  return {
    useFloating: () => null,
    flip: null,
    shift: null,
    offset: null,
  };
});

// Avoid pulling in expo-sqlite, as it crashes vitest.
vi.mock(
  `../src/client/ui/replicacheOptions.ts`,
  (): typeof import("../src/client/ui/replicacheOptions.ts") => ({
    kvStore: {
      create: vi.fn(),
      drop: vi.fn(),
    },
  }),
);

// Setup localStorage global.
{
  const localStorageMock: Storage = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string): string | null => store[key] ?? null,
      setItem: (key: string, value: string): void => {
        store[key] = value;
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
      clear: (): void => {
        store = {};
      },
      key: (_index: number): string | null => {
        throw new Error(`Not implemented`);
      },
      get length() {
        return Object.keys(store).length;
      },
    };
  })();

  vi.stubGlobal(`localStorage`, localStorageMock);
}
