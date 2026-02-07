// oxlint-disable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return
import type { ImageSource } from "expo-image";
import { Platform } from "react-native";

type LocalImageLoader = () => Promise<ImageSource>;

const localImageAssetLoaders: Record<string, LocalImageLoader> = {
  "app:illustration:edge": async () => {
    if (Platform.OS === `web`) {
      // @ts-expect-error asset modules are resolved by the bundler at runtime.
      const module = (await import(`../../assets/illustrations/edge.jpg`)) as {
        default: ImageSource;
      };
      return module.default;
    }

    return require(`../../assets/illustrations/edge.jpg`) as ImageSource;
  },
};

const localImageAssetCache = new Map<string, ImageSource>();
// oxlint-enable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

export type LocalImageAssetId = keyof typeof localImageAssetLoaders;

export function isLocalImageAssetId(assetId: string): boolean {
  return assetId in localImageAssetLoaders;
}

export async function getLocalImageAssetSource(
  assetId: string,
): Promise<ImageSource | undefined> {
  const loader = localImageAssetLoaders[assetId];
  if (loader == null) {
    return undefined;
  }
  if (localImageAssetCache.has(assetId)) {
    return localImageAssetCache.get(assetId);
  }
  const source = await loader();
  localImageAssetCache.set(assetId, source);
  return source;
}
