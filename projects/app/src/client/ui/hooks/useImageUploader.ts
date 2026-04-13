import { trpc } from "@/client/trpc";
import { useAssetImageCacheMutation } from "@/client/ui/hooks/useAssetImageCacheMutation";
import type { AllowedImageMimeType, AssetId } from "@/data/model";
import { allowedImageMimeTypeEnum } from "@/data/model";
import { getArrayBufferAssetId } from "@/util/assetId";
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
 * 1. Optimistically cache notUploaded blob locally
 * 2. Request presigned upload URL from server
 * 3. Upload image directly to S3
 * 4. Promote cache entry to uploaded
 */
export function useImageUploader({
  onUploadComplete,
  onUploadError,
}: ImageUploaderOptions) {
  const { setCache, clearCache } = useAssetImageCacheMutation();
  const [uploading, setUploading] = useState(false);
  const requestUploadUrl = trpc.asset.requestUploadUrl.useMutation();

  const uploadImageBlob = async ({
    blob,
    contentType,
  }: {
    blob: Blob;
    contentType?: string | null;
  }): Promise<AssetId | null> => {
    if (uploading) {
      return null;
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

      // Optimistic local availability: cache the selected blob before any
      // network request so the UI can render immediately.
      try {
        await setCache(assetId, {
          kind: `notUploaded`,
          blob,
          contentType: resolvedContentType,
        });
      } catch (cacheError) {
        console.warn(`Failed to cache image blob before upload`, cacheError);
      }

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

      // Promote cache entry after successful upload. This warms the HTTP cache
      // for CDN URL fetches and clears the temporary notUploaded blob entry.
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
      return assetId;
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
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadImagePickerAsset = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<AssetId | null> => {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const contentType = asset.mimeType ?? blob.type;
    return uploadImageBlob({ blob, contentType });
  };

  return { uploading, uploadImageBlob, uploadImagePickerAsset };
}
