// Used by the resolver in metro.config.cjs to work around https://github.com/expo/expo/issues/47938#issuecomment-6224530932.
export const updateId: typeof import("expo-updates").updateId = null;
export const isEmbeddedLaunch: typeof import("expo-updates").isEmbeddedLaunch = false;
export const manifest: typeof import("expo-updates").manifest = {};
