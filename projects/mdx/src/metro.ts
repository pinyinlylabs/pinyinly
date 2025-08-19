import type { MetroConfig } from "metro-config";
import path from "node:path";

/**
 * Adds MDX support to a Metro config
 */
export function withMdx<T extends MetroConfig>(config: T): T {
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  const defaultTransformerPath = path.join(currentDir, `default-metro-transformer.js`);

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
        babelTransformerPath: defaultTransformerPath,
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