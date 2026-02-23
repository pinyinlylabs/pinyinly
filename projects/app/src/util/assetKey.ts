export const assetKeyPrefix = `blob/`;

export function getAssetKeyForId(assetId: string): string {
  return `${assetKeyPrefix}${assetId}`;
}
