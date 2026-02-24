import type { IconRegistry } from "#client/ui/iconRegistry.js";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { Component } from "react";
import { createElement, Fragment } from "react";
import { View } from "react-native-web";
import { expect, vi } from "vitest";

expect.extend(matchers);

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

vi.mock(`@/client/assets/localImageAssets`, () => {
  return {
    getLocalImageAssetSource: async () => {},
    isLocalImageAssetId: () => false,
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

vi.mock(`expo-secure-store`, () => {
  return {
    getItemAsync: () => null,
    deleteItemAsync: () => null,
    setItemAsync: () => null,
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
    },
  };
});

vi.mock(`expo-image-picker`, () => {
  return {
    launchImageLibraryAsync: () => null,
    requestMediaLibraryPermissionsAsync: () => null,
  };
});

vi.mock(`nativewind`, () => {
  return {
    cssInterop: () => null,
    default: {
      createAnimatedComponent: (x: Component) => x,
      View,
    },
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
  // oxlint-disable-next-line typescript-eslint(consistent-type-imports)
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
