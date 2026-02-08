import { useReplicache } from "@/client/hooks/useReplicache";
import { trpc } from "@/client/trpc";
import type { v10 } from "@/data/rizzleSchema";
import { nanoid } from "@/util/nanoid";
import type { RizzleReplicache } from "@/util/rizzle";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { IconImage } from "./IconImage";
import { RectButton } from "./RectButton";

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

interface ImageUploadButtonProps {
  /**
   * Called when the upload completes successfully with the assetId.
   */
  onUploadComplete: (assetId: string) => void;
  /**
   * Called when the upload fails with an error message.
   */
  onUploadError?: (error: string) => void;
  /**
   * Optional custom button text.
   */
  buttonText?: string;
}

interface ImageUploaderOptions {
  onUploadComplete: (assetId: string) => void;
  onUploadError?: (error: string) => void;
}

/**
 * Button component for uploading images to R2 storage via presigned URLs.
 *
 * Flow:
 * 1. User taps button → Image picker opens
 * 2. User selects image → Optimistically create pending asset in Replicache
 * 3. Request presigned upload URL from server
 * 4. Upload image directly to R2
 * 5. Confirm upload in Replicache
 * 6. Verify upload on server
 * 7. Call onUploadComplete with assetId
 */
export function useImageUploader({
  onUploadComplete,
  onUploadError,
}: ImageUploaderOptions) {
  const rep = useReplicache() as RizzleReplicache<typeof v10>;
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

      const assetId = nanoid();

      // 1. Create pending asset in Replicache
      await rep.mutate.initAsset({
        assetId,
        contentType: resolvedContentType,
        contentLength,
        now: new Date(),
      });

      // 2. Get presigned upload URL
      const { uploadUrl } = await requestUploadUrl.mutateAsync({
        assetId,
        contentType: resolvedContentType,
        contentLength,
      });

      // 3. Upload file directly to R2
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

      // 4. Confirm upload in Replicache
      await rep.mutate.confirmAssetUpload({
        assetId,
        now: new Date(),
      });

      // 5. Verify server-side
      const { success } = await confirmUpload.mutateAsync({ assetId });

      if (!success) {
        await rep.mutate.failAssetUpload({
          assetId,
          errorMessage: `Upload verification failed`,
          now: new Date(),
        });
        throw new Error(`Upload verification failed`);
      }

      // Success!
      onUploadComplete(assetId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Unknown error occurred`;
      onUploadError?.(message);

      // Show error in console for debugging
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

export function ImageUploadButton({
  onUploadComplete,
  onUploadError,
  buttonText = `Upload image`,
}: ImageUploadButtonProps) {
  const { uploading, uploadImagePickerAsset } = useImageUploader({
    onUploadComplete,
    onUploadError,
  });

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== `granted`) {
      onUploadError?.(`Permission to access media library is required`);
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [`images`],
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (asset == null) {
      return;
    }

    await uploadImagePickerAsset(asset);
  };

  return (
    <RectButton
      variant="outline"
      onPress={() => {
        void handlePickImage();
      }}
      disabled={uploading}
      className="flex-row items-center gap-2"
    >
      {uploading ? (
        <>
          <ActivityIndicator size="small" className="text-fg" />
          <Text className="text-fg">Uploading...</Text>
        </>
      ) : (
        <>
          <IconImage size={16} icon="puzzle" className="text-fg" />
          <Text className="text-fg">{buttonText}</Text>
        </>
      )}
    </RectButton>
  );
}
