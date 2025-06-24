import * as matchers from "@testing-library/jest-dom/matchers";
import type { Component } from "react";
import { View } from "react-native-web";
import { expect, vi } from "vitest";

expect.extend(matchers);

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

// Set up __DEV__ global variable
// @ts-expect-error __DEV__ is not defined in Node
globalThis.__DEV__ = true;
