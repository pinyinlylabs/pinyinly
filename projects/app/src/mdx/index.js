// @ts-check

/**
 * @typedef {import('metro-config').MetroConfig} MetroConfig
 */

/**
 * Adds MDX support to a Metro config
 * @param {MetroConfig} config - Metro config loaded with `getDefaultConfig(__dirname);`
 * @returns {MetroConfig} Updated Metro config with MDX support
 */
export function withMdx(config) {
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
        babelTransformerPath: new URL(
          `default-metro-transformer.js`,
          import.meta.url,
        ).pathname,
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
