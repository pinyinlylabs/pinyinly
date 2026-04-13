import { useAssetImageCacheQuery } from "@/client/ui/hooks/useAssetImageCacheQuery";
import type { AssetId } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsCdnBaseUrl } from "@/util/env";
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
  const assetKey = getBucketObjectKeyForId(assetId);

  useEffect(() => {
    if (imageSize != null) {
      return;
    }

    const sourceUri = cacheUri ?? `${assetsCdnBaseUrl}${assetKey}`;

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

  if (imageSize == null) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  const imageSource = {
    uri: `${assetsCdnBaseUrl}${assetKey}`,
  } satisfies ImageSourcePropType;

  return { status: `ready`, imageSize, imageSource };
}
