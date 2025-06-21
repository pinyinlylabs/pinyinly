import { mock } from "node:test";
import type { Component } from "react";
import { View } from "react-native-web";

// Mock react-native to use react-native-web otherwise Node will try to import
// Flow type files and fail.
mock.module(`react-native`, {
  namedExports: await import(`react-native-web`),
});

mock.module(`expo-haptics`);

mock.module(`expo-image`, {
  namedExports: {
    // SyntaxError: The requested module 'expo-image' does not provide an export
    // named 'Image'
    Image: () => null,
  },
});

mock.module(`expo-secure-store`, {
  namedExports: {
    getItemAsync: () => null,
    deleteItemAsync: () => null,
    setItemAsync: () => null,
  },
});

mock.module(`react-native-reanimated`, {
  namedExports: {
    useSharedValue: () => null,
    useAnimatedStyle: () => ({}),
    withDelay: null,
    withSpring: null,
    withTiming: null,
    Easing: null,
    Extrapolation: null,
    interpolate: null,
    interpolateColor: null,
  },
  defaultExport: {
    createAnimatedComponent: (x: Component) => x,
  },
});

mock.module(`nativewind`, {
  namedExports: {
    cssInterop: () => null,
  },
  defaultExport: {
    createAnimatedComponent: (x: Component) => x,
    View,
  },
});

{
  // Set up __DEV__
  // @ts-expect-error __DEV__ is not defined in Node
  globalThis.__DEV__ = true;
}

{
  // Set up global expect
  const { expect } = await import(`expect`);
  globalThis.expect = expect;
}
