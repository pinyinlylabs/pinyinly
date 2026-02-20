// Learn more https://docs.expo.io/guides/customizing-metro
const { withNativeWind } = require(`nativewind/metro`);
const { withMdx } = require(`@pinyinly/mdx/metro`);
const { withAudioSprites } = require(`@pinyinly/audio-sprites/metro`);

const { getSentryExpoConfig } = require(`@sentry/react-native/metro`);

// TODO: [@sentry/react-native@>7.7.0] try swapping back to `getDefaultConfig`
// from `expo/metro-config`.
let config = getSentryExpoConfig(__dirname);

const originalResolveRequest = config.resolver?.resolveRequest;
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
    ],
    unstable_enablePackageExports: true,

    resolveRequest(context, moduleName, platform) {
      const parentResolver = originalResolveRequest ?? context.resolveRequest;

      // Custom resolver: Conditionally route wikiRegistry imports
      //
      // When PYLY_SLIM_WIKI_FOR_TESTING=true (CI builds), Metro resolves:
      //   import { _wikiRegistry } from "./wikiRegistry"
      // to:
      //   "./wikiRegistry.slim.ts" (empty registry, 13 lines)
      // instead of:
      //   "./wikiRegistry.ts" (full registry with 3000+ MDX imports, 3074 lines)
      //
      // This happens at Metro's module resolution phase BEFORE processing imports,
      // so Metro never sees or bundles the 3000+ MDX files. This is similar to
      // how platform-specific resolution works (.web.ts, .ios.ts).
      //
      // Result: CI builds go from 5-10min → ~1-2min per platform
      if (moduleName.endsWith(`/wikiRegistry`)) {
        const useSlimWiki =
          process.env[`PYLY_SLIM_WIKI_FOR_TESTING`] === `true`;

        if (useSlimWiki) {
          // Route to the slim/CI version instead of the full registry
          const slimModuleName = moduleName.replace(
            `/wikiRegistry`,
            `/wikiRegistry.slim`,
          );
          return parentResolver(context, slimModuleName, platform);
        }
      }

      return parentResolver(context, moduleName, platform);
    },
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
//
// TODO: [@sentry/react-native@>7.7.0] try re-enabling
// config = withSentryConfig(config, {
//   annotateReactComponents: false,
//   enableSourceContextInDevelopment: false,
// });

module.exports = config;
