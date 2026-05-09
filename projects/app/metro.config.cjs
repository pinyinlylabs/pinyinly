// Learn more https://docs.expo.io/guides/customizing-metro
const { withNativeWind } = require(`nativewind/metro`);
const { getSentryExpoConfig } = require(`@sentry/react-native/metro`);

/** @type Record<string, { moduleName?: string; platform?: string }> */
const resolverOverrides = {
  // See https://community.apollographql.com/t/cannot-destructure-property-extends-of-tslib-default-as-it-is-undefined/9501/2
  [`tslib`]: { moduleName: `tslib/tslib.es6.js` },
  // Avoid the Node.js version which uses import("node:diagnostics_channel").
  [`lru-cache`]: { platform: `web` },
};

// TODO: [@sentry/react-native@>7.7.0] try swapping back to `getDefaultConfig`
// from `expo/metro-config`.
let config = getSentryExpoConfig(__dirname);
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
      return context.resolveRequest(
        context,
        resolverOverrides[moduleName]?.moduleName ?? moduleName,
        resolverOverrides[moduleName]?.platform ?? platform,
      );
    },
    unstable_enablePackageExports: true,
  },
};

config = withNativeWind(config, {
  input: `./src/global.css`,
  inlineRem: 16,
  // @ts-expect-error this is overriden, see https://github.com/nativewind/nativewind/pull/1371
  getCSSForPlatform: undefined,
});

// Doing Sentry last is probably important so that the hashed debug IDs are
// based on the final content of the final and aren't stripped by any other
// processors.
//
// TODO: [@sentry/react-native@>7.7.0] try re-enabling
// config = withSentryConfig(config, {
//   annotateReactComponents: false,
//   enableSourceContextInDevelopment: false,
// });

module.exports = config;
