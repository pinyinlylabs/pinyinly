import * as upstreamTransformer from "@expo/metro-config/babel-transformer";
import type { MetroBabelTransformer } from "./metro-transformer";
import { transform as expoMdxTransform } from "./metro-transformer";

export const transform: MetroBabelTransformer[`transform`] = async (args) => {
  return await (upstreamTransformer as MetroBabelTransformer).transform(
    await expoMdxTransform(args),
  );
};
