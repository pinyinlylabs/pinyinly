import { useAssetImageCacheQuery } from "@/client/ui/hooks/useAssetImageCacheQuery";
import { useDb } from "@/client/ui/hooks/useDb";
import type { AssetId } from "@/data/model";
import { AssetStatusKind } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsCdnBaseUrl } from "@/util/env";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { Image } from "react-native";

export interface AssetImageMetaResult {
  status: `loading` | `ready` | `error`;
  imageSize: { width: number; height: number } | null;
  imageSource: ImageSourcePropType | null;
}

export function useAssetImageMeta(
  assetId: AssetId,
  initialImageWidth?: number | null,
  initialImageHeight?: number | null,
): AssetImageMetaResult {
  const db = useDb();
  const { data: asset } = useLiveQuery(
    (q) =>
      q
        .from({ asset: db.assetCollection })
        .where(({ asset }) => eq(asset.assetId, assetId))
        .findOne(),
    [db.assetCollection, assetId],
  );
  const cachedImageSource = useAssetImageCacheQuery(assetId);
  const cacheUri =
    cachedImageSource != null &&
    typeof cachedImageSource === `object` &&
    `uri` in cachedImageSource &&
    typeof cachedImageSource.uri === `string`
      ? cachedImageSource.uri
      : null;
  const initialImageSize =
    initialImageWidth != null && initialImageHeight != null
      ? { width: initialImageWidth, height: initialImageHeight }
      : null;
  const [imageSizeState, setImageSizeState] = useState<{
    assetId: AssetId;
    imageSize: {
      width: number;
      height: number;
    } | null;
  }>({
    assetId,
    imageSize: initialImageSize,
  });
  const imageSize =
    imageSizeState.assetId === assetId
      ? imageSizeState.imageSize
      : initialImageSize;
  const assetKey =
    asset?.status === AssetStatusKind.Uploaded
      ? getBucketObjectKeyForId(assetId)
      : null;

  useEffect(() => {
    if (imageSize != null) {
      return;
    }

    const sourceUri =
      cacheUri ?? (assetKey == null ? null : `${assetsCdnBaseUrl}${assetKey}`);

    if (sourceUri == null) {
      return;
    }

    Image.getSize(
      sourceUri,
      (width, height) => {
        setImageSizeState({
          assetId,
          imageSize: { width, height },
        });
      },
      () => {
        setImageSizeState({
          assetId,
          imageSize: null,
        });
      },
    );
  }, [assetId, assetKey, cacheUri, imageSize]);

  if (cachedImageSource != null) {
    return {
      status: imageSize == null ? `loading` : `ready`,
      imageSize,
      imageSource: cachedImageSource as ImageSourcePropType,
    };
  }

  if (asset == null) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  if (asset.status === AssetStatusKind.Failed) {
    return { status: `error`, imageSize: null, imageSource: null };
  }

  if (asset.status === AssetStatusKind.Pending) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  if (imageSize == null) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  const imageSource =
    assetKey == null
      ? null
      : ({
          uri: `${assetsCdnBaseUrl}${assetKey}`,
        } satisfies ImageSourcePropType);

  if (imageSource == null) {
    return { status: `loading`, imageSize, imageSource: null };
  }

  return { status: `ready`, imageSize, imageSource };
}
