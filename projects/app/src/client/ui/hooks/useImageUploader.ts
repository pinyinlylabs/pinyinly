import { trpc } from "@/client/trpc";
import { useAssetImageCacheMutation } from "@/client/ui/hooks/useAssetImageCacheMutation";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import type { AllowedImageMimeType, AssetId } from "@/data/model";
import { allowedImageMimeTypeEnum } from "@/data/model";
import type { currentSchema } from "@/data/rizzleSchema";
import { getArrayBufferAssetId } from "@/util/assetId";
import type { RizzleReplicache } from "@/util/rizzle";
import type * as ImagePicker from "expo-image-picker";
import { useState } from "react";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function isAllowedImageType(value: string): value is AllowedImageMimeType {
  return allowedImageMimeTypeEnum.safeParse(value).success;
}

interface ImageUploaderOptions {
  onUploadComplete: (assetId: AssetId) => void;
  onUploadError?: (error: string) => void;
}

/**
 * Hook for uploading images to S3 storage via presigned URLs.
 *
 * Flow:
 * 1. Optimistically create pending asset in Replicache
 * 2. Request presigned upload URL from server
 * 3. Upload image directly to S3
 * 4. Confirm upload in Replicache
 * 5. Verify upload on server
 */
export function useImageUploader({
  onUploadComplete,
  onUploadError,
}: ImageUploaderOptions) {
  const rep = useRizzle() as RizzleReplicache<typeof currentSchema>;
  const { setCache, clearCache } = useAssetImageCacheMutation();
  const [uploading, setUploading] = useState(false);
  const requestUploadUrl = trpc.asset.requestUploadUrl.useMutation();
  const confirmUpload = trpc.asset.confirmUpload.useMutation();

  const uploadImageBlob = async ({
    blob,
    contentType,
  }: {
    blob: Blob;
    contentType?: string | null;
  }): Promise<void> => {
    if (uploading) {
      return;
    }

    setUploading(true);
    let assetId: AssetId | null = null;

    try {
      const resolvedContentType = contentType ?? blob.type;
      if (resolvedContentType.length === 0) {
        throw new Error(`Image type is missing`);
      }

      if (!isAllowedImageType(resolvedContentType)) {
        throw new Error(`Unsupported image type. Use JPEG, PNG, WebP, or GIF`);
      }

      const contentLength = blob.size;
      if (contentLength > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(`Image must be smaller than 5MB`);
      }

      assetId = await getArrayBufferAssetId(await blob.arrayBuffer());

      try {
        await setCache(assetId, {
          kind: `pending`,
          blob,
          contentType: resolvedContentType,
        });
      } catch (cacheError) {
        console.warn(`Failed to cache image blob before upload`, cacheError);
      }

      await rep.mutate.initAsset({
        assetId,
        contentType: resolvedContentType,
        contentLength,
        now: new Date(),
      });

      const { uploadUrl } = await requestUploadUrl.mutateAsync({
        assetId,
        contentType: resolvedContentType,
        contentLength,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: `PUT`,
        body: blob,
        headers: {
          "Content-Type": resolvedContentType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      await rep.mutate.confirmAssetUpload({
        assetId,
        now: new Date(),
      });

      const { success } = await confirmUpload.mutateAsync({ assetId });

      if (!success) {
        await rep.mutate.failAssetUpload({
          assetId,
          errorMessage: `Upload verification failed`,
          now: new Date(),
        });
        throw new Error(`Upload verification failed`);
      }

      try {
        await setCache(assetId, {
          kind: `uploaded`,
          blob,
          contentType: resolvedContentType,
        });
      } catch (cacheError) {
        console.warn(
          `Failed to populate HTTP cache for uploaded image`,
          cacheError,
        );
      }

      onUploadComplete(assetId);
    } catch (error) {
      if (assetId != null) {
        try {
          await clearCache(assetId);
        } catch (cacheError) {
          console.warn(
            `Failed to clear cached image blob after upload error`,
            cacheError,
          );
        }
      }

      const message =
        error instanceof Error ? error.message : `Unknown error occurred`;
      onUploadError?.(message);

      console.error(`Image upload failed:`, error);
    } finally {
      setUploading(false);
    }
  };

  const uploadImagePickerAsset = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<void> => {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const contentType = asset.mimeType ?? blob.type;
    await uploadImageBlob({ blob, contentType });
  };

  return { uploading, uploadImageBlob, uploadImagePickerAsset };
}
