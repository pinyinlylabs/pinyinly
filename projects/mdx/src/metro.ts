import type { MetroConfig } from "metro-config";

/**
 * Adds MDX support to a Metro config
 */
export function withMdx<T extends MetroConfig>(config: T): T {
  // // Ensure md and mdx are supported
  // if (config.resolver?.sourceExts?.includes(`md`) !== true) {
  //   config = {
  //     ...config,
  //     resolver: {
  //       ...config.resolver,
  //       sourceExts: [...(config.resolver?.sourceExts ?? []), `md`, `mdx`],
  //     },
  //   };
  // }

  return config;
}
