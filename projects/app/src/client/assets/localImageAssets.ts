// oxlint-disable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

type LocalImageLoader = () => Promise<RnRequireSource>;

const localImageAssetLoaders: Record<string, LocalImageLoader> = {
  "app:illustration:edge": async () =>
    require(`../../assets/illustrations/edge.jpg`),
  "wiki:学:child": async () => require(`../wiki/学/child.png`),
  "wiki:原:meaning": async () => require(`../wiki/原/meaning.png`),
  "wiki:坏:meaning": async () => require(`../wiki/坏/meaning.png`),
  "wiki:看:meaning": async () => require(`../wiki/看/meaning.jpg`),
  "wiki:福:meaning": async () => require(`../wiki/福/meaning.webp`),
};

const localImageAssetCache = new Map<string, RnRequireSource>();
// oxlint-enable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

export type LocalImageAssetId = keyof typeof localImageAssetLoaders;

export function isLocalImageAssetId(assetId: string): boolean {
  return assetId in localImageAssetLoaders;
}

export async function getLocalImageAssetSource(
  assetId: string,
): Promise<RnRequireSource | undefined> {
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
