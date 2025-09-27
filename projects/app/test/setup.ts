import * as matchers from "@testing-library/jest-dom/matchers";
import type { Component } from "react";
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

vi.mock(`nativewind`, () => {
  return {
    cssInterop: () => null,
    default: {
      createAnimatedComponent: (x: Component) => x,
      View,
    },
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

// Set up __DEV__ global variable
// @ts-expect-error __DEV__ is not defined in Node
globalThis.__DEV__ = true;
