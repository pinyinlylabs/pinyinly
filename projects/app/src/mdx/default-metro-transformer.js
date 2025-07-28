// @ts-check

import upstreamTransformer from "@expo/metro-config/build/babel-transformer.js";
import { transform as expoMdxTransform } from "./metro-transformer.js";

/**
 * @typedef {import('./metro-transformer.js').MetroBabelTransformer} MetroBabelTransformer
 * @typedef {MetroBabelTransformer["transform"]} MetroBabelTransform
 */

/**
 * Transform function for Metro bundler
 *
 * @type {MetroBabelTransform}
 */
export const transform = async (args) => {
  return await /** @type {MetroBabelTransformer} */ (
    upstreamTransformer
  ).transform(await expoMdxTransform(args));
};
