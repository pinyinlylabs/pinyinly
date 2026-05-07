// Learn more https://docs.expo.io/guides/customizing-metro
const { withNativeWind } = require(`nativewind/metro`);
const { withMdx } = require(`@pinyinly/mdx/metro`);
const { withAudioSprites } = require(`@pinyinly/audio-sprites/metro`);
const { withSlimWikiRegistryResolver } = require(
  `./src/metro/withSlimWikiRegistryResolver`,
);
const { getSentryExpoConfig } = require(`@sentry/react-native/metro`);

/** @type Record<string, string> */
const moduleAliases = {
  // See https://community.apollographql.com/t/cannot-destructure-property-extends-of-tslib-default-as-it-is-undefined/9501/2
  tslib: `tslib/tslib.es6.js`,
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
        moduleAliases[moduleName] ?? moduleName,
        platform,
      );
    },
    unstable_enablePackageExports: true,
  },
};

config = withSlimWikiRegistryResolver(config);

config = withAudioSprites(config, {
  manifestPath: `./src/assets/audio/manifest.json`,
  cachePath: `./.cache/audio-sprites`,
});

config = withNativeWind(config, {
  input: `./src/global.css`,
  inlineRem: 16,
  // @ts-expect-error this is overriden, see https://github.com/nativewind/nativewind/pull/1371
  getCSSForPlatform: undefined,
});

config = withMdx(config);

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
