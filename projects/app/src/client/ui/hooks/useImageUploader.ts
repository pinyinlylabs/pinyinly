import { trpc } from "@/client/trpc";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { getBlobSha256Base64Url } from "@/client/util/assetHash";
import type { currentSchema } from "@/data/rizzleSchema";
import type { RizzleReplicache } from "@/util/rizzle";
import type * as ImagePicker from "expo-image-picker";
import { useState } from "react";

export type AllowedImageType =
  | `image/jpeg`
  | `image/png`
  | `image/webp`
  | `image/gif`;

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const allowedImageTypes: AllowedImageType[] = [
  `image/jpeg`,
  `image/png`,
  `image/webp`,
  `image/gif`,
];

function isAllowedImageType(value: string): value is AllowedImageType {
  return allowedImageTypes.includes(value as AllowedImageType);
}

interface ImageUploaderOptions {
  onUploadComplete: (assetId: string) => void;
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

    try {
      const resolvedContentType = contentType ?? blob.type;
      if (resolvedContentType == null || resolvedContentType.length === 0) {
        throw new Error(`Image type is missing`);
      }

      if (!isAllowedImageType(resolvedContentType)) {
        throw new Error(`Unsupported image type. Use JPEG, PNG, WebP, or GIF`);
      }

      const contentLength = blob.size;
      if (contentLength > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(`Image must be smaller than 5MB`);
      }

      const assetId = await getBlobSha256Base64Url(blob);

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

      onUploadComplete(assetId);
    } catch (error) {
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
    const contentType = asset.mimeType ?? blob.type ?? `image/jpeg`;
    await uploadImageBlob({ blob, contentType });
  };

  return { uploading, uploadImageBlob, uploadImagePickerAsset };
}
