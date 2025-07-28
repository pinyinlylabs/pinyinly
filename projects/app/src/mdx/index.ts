import type { MetroConfig } from "metro-config";

/** @param config: Metro config loaded with `getDefaultConfig(__dirname);` */
export function withMdx(config: MetroConfig) {
  if (
    // !config.transformer.babelTransformerPath ||
    // Overwrite the default expo value.
    config.transformer?.babelTransformerPath?.endsWith(
      `@expo/metro-config/build/babel-transformer.js`,
    ) === true
  ) {
    config = {
      ...config,
      transformer: {
        ...config.transformer,
        babelTransformerPath: require.resolve(
          `@/mdx/default-metro-transformer`,
        ),
      },
    };
  } else {
    console.warn(
      `@pinyinly/mdx: Using custom babel transformer:`,
      config.transformer?.babelTransformerPath,
    );
    console.warn(`Ensure it includes the MDX transformer from @pinyinly/mdx`);
  }

  // Ensure md and mdx are supported
  if (config.resolver?.sourceExts?.includes(`md`) !== true) {
    config = {
      ...config,
      resolver: {
        ...config.resolver,
        sourceExts: [...(config.resolver?.sourceExts ?? []), `md`, `mdx`],
      },
    };
  }

  return config;
}
