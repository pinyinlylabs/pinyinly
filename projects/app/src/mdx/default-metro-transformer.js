// @ts-check

import upstreamTransformer from "@expo/metro-config/build/babel-transformer.js";
import { transform as expoMdxTransform } from "./metro-transformer.js";

/**
 * @typedef {import('./metro-transformer.js').MetroBabelTransformer} MetroBabelTransformer
 */

/**
 * Transform function for Metro bundler
 *
 * @type {MetroBabelTransformer}
 */
export const transform = async (args) => {
  const upstreamTransform =
    /** @type {{ transform: MetroBabelTransformer }} */ (upstreamTransformer)
      .transform;

  return await upstreamTransform(await expoMdxTransform(args));
};
