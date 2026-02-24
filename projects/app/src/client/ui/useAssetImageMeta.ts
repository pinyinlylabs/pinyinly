import {
  getLocalImageAssetSource,
  isLocalImageAssetId,
} from "@/client/assets/localImageAssets";
import { useDb } from "@/client/ui/hooks/useDb";
import type { AssetId } from "@/data/model";
import { AssetStatusKind } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsCdnBaseUrl } from "@/util/env";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect, useRef, useState } from "react";
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
  const { data: assetData } = useLiveQuery(
    (q) =>
      q
        .from({ asset: db.assetCollection })
        .where(({ asset }) => eq(asset.assetId, assetId)),
    [db.assetCollection, assetId],
  );
  const asset = assetData[0] ?? null;

  const [localSource, setLocalSource] = useState<Awaited<
    ReturnType<typeof getLocalImageAssetSource>
  > | null>(null);
  const [localSourceChecked, setLocalSourceChecked] = useState(false);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(
    initialImageWidth != null && initialImageHeight != null
      ? { width: initialImageWidth, height: initialImageHeight }
      : null,
  );

  const isLocalAsset = isLocalImageAssetId(assetId);
  const assetKey =
    !isLocalAsset && asset?.status === AssetStatusKind.Uploaded
      ? getBucketObjectKeyForId(assetId)
      : null;

  const hasClearedLocalRef = useRef(false);
  useEffect(() => {
    if (hasClearedLocalRef.current) {
      return;
    }

    hasClearedLocalRef.current = true;
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLocalSource(null);
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLocalSourceChecked(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const source = await getLocalImageAssetSource(assetId);
      if (cancelled) {
        return;
      }
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setLocalSource(source ?? null);
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setLocalSourceChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    if (imageSize != null) {
      return;
    }

    if (localSource != null) {
      if (typeof Image.resolveAssetSource === `function`) {
        const resolved = Image.resolveAssetSource(
          localSource as Parameters<typeof Image.resolveAssetSource>[0],
        );
        if (resolved.width != null && resolved.height != null) {
          // oxlint-disable-next-line react-hooks-js/set-state-in-effect
          setImageSize({ width: resolved.width, height: resolved.height });
        }
        return;
      }

      const localSourceUri =
        typeof localSource === `string`
          ? localSource
          : typeof localSource === `object` &&
              localSource != null &&
              `uri` in localSource &&
              typeof (localSource as { uri?: unknown }).uri === `string`
            ? (localSource as { uri: string }).uri
            : null;

      if (localSourceUri != null) {
        Image.getSize(
          localSourceUri,
          (width, height) => {
            setImageSize({ width, height });
          },
          () => {
            setImageSize(null);
          },
        );
      }

      return;
    }

    if (assetKey == null) {
      return;
    }

    const imageUrl = `${assetsCdnBaseUrl}${assetKey}`;
    Image.getSize(
      imageUrl,
      (width, height) => {
        setImageSize({ width, height });
      },
      () => {
        setImageSize(null);
      },
    );
  }, [assetKey, imageSize, localSource]);

  if (localSource != null) {
    return {
      status: imageSize == null ? `loading` : `ready`,
      imageSize,
      imageSource: localSource as ImageSourcePropType,
    };
  }

  if (isLocalAsset && !localSourceChecked) {
    return { status: `loading`, imageSize: null, imageSource: null };
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
