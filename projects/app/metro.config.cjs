// Set the build time before Metro bundles the app; Expo inlines EXPO_PUBLIC_* values into the bundle.
process.env.EXPO_PUBLIC_BUILD_TIMESTAMP ??= new Date().toISOString();

const { getDefaultConfig } = require(`expo/metro-config`);
const { withUniwindConfig } = require(`uniwind/metro`);
const { getSentryExpoConfig } = require(`@sentry/react-native/metro`);

const expoUpdatesMockPath = require.resolve(
  `./src/metro/expo-updates.web.dev.ts`,
);

/** @type Record<string, { moduleName?: string; platform?: string }> */
const resolverOverrides = {
  // See https://community.apollographql.com/t/cannot-destructure-property-extends-of-tslib-default-as-it-is-undefined/9501/2
  [`tslib`]: { moduleName: `tslib/tslib.es6.js` },
  // Avoid the Node.js version which uses import("node:diagnostics_channel").
  [`lru-cache`]: { platform: `web` },
};

/** @type {import('metro-config').MetroConfig} */
let config =
  // In development Sentry causes a memory leak that eventually crashes expo.
  process.env.NODE_ENV === `development`
    ? /** @type {unknown} */ getDefaultConfig(__dirname)
    : /** @type {import('metro-config').MetroConfig} */ (
        /** @type {unknown} */ getSentryExpoConfig(__dirname)
      );

config = {
  ...config,

  // Force invalid require(…) calls to error on build rather than runtime.
  transformer: {
    ...config.transformer,
    dynamicDepsInPackages: `reject`,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
      },
    }),
  },

  // Fixes "Metro has encountered an error: While trying to resolve module `replicache-react`"
  resolver: {
    ...config.resolver,
    blockList: [
      // Ignore data folders of other services, to avoid Metro rebundling unnecessarily.
      // oxlint-disable-next-line require-unicode-regexp -- Error: Cannot combine blockList patterns, because they have different flags:
      /\.inngest\/.*/,
      // oxlint-disable-next-line require-unicode-regexp -- Error: Cannot combine blockList patterns, because they have different flags:
      /\.minio\/.*/,
    ].concat(config.resolver?.blockList ?? []),
    assetExts: [
      ...(config.resolver?.assetExts ?? []),
      // Add Rive support.
      `riv`,
      // ML models
      `onnx`,
      // ML model vectors
      `bin`,
      // WebAssembly
      `wasm`,
    ],
    resolveRequest: (context, moduleName, platform) => {
      // Work around https://github.com/expo/expo/issues/47938#issuecomment-6224530932.
      if (
        process.env.NODE_ENV === `development` &&
        platform === `web` &&
        moduleName === `expo-updates`
      ) {
        return { type: `sourceFile`, filePath: expoUpdatesMockPath };
      }

      return context.resolveRequest(
        context,
        resolverOverrides[moduleName]?.moduleName ?? moduleName,
        resolverOverrides[moduleName]?.platform ?? platform,
      );
    },
    unstable_enablePackageExports: true,
  },
};

config = withUniwindConfig(config, {
  // Keep in sync between vitest.browser.config.ts + moon.yml + metro.config.cjs
  cssEntryFile: `./src/global.css`,
  dtsFile: `./uniwind-env.d.ts`,
  extraThemes: [
    `dark-danger-panel`,
    `dark-grass-panel`,
    `dark-placeholder-panel`,
    `dark-popover`,
    `dark-sky-panel`,
    `dark-success-panel`,
    `dark-warning-panel`,
    `dark`,
    `light-danger-panel`,
    `light-grass-panel`,
    `light-placeholder-panel`,
    `light-popover`,
    `light-sky-panel`,
    `light-success-panel`,
    `light-warning-panel`,
    `light`,
  ],
});

module.exports = config;
