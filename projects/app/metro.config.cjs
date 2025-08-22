// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require(`expo/metro-config`);
const { withSentryConfig } = require(`@sentry/react-native/metro`);
const { withNativeWind } = require(`nativewind/metro`);
const { withMdx } = require(`@pinyinly/mdx/metro`);
const { withAudioSprites } = require(`@pinyinly/audio-sprites/metro`);

let config = getDefaultConfig(__dirname);

config = {
  ...config,

  // Force invalid require(…) calls to error on build rather than runtime.
  transformer: {
    ...config.transformer,
    dynamicDepsInPackages: `reject`,
  },

  // Fixes "Metro has encountered an error: While trying to resolve module `replicache-react`"
  resolver: {
    ...config.resolver,
    assetExts: [
      ...(config.resolver?.assetExts ?? []),
      // Add Rive support.
      `riv`,
    ],
    unstable_enablePackageExports: true,
  },
};

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
config = withSentryConfig(config);

module.exports = config;
