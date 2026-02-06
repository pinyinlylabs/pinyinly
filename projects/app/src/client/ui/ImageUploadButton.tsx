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
export function ImageUploadButton({
  onUploadComplete,
  onUploadError,
  buttonText = `Upload image`,
}: ImageUploadButtonProps) {
  const rep = useReplicache() as RizzleReplicache<typeof v10>;
  const [uploading, setUploading] = useState(false);
  const requestUploadUrl = trpc.asset.requestUploadUrl.useMutation();
  const confirmUpload = trpc.asset.confirmUpload.useMutation();

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

    await uploadImage(asset);
  };

  const uploadImage = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<void> => {
    setUploading(true);

    try {
      const assetId = nanoid();

      // Get file info
      const uri = asset.uri;
      const contentType = (asset.mimeType ?? `image/jpeg`) as AllowedImageType;

      // Fetch the file as a blob for file size
      const response = await fetch(uri);
      const blob = await response.blob();
      const contentLength = blob.size;

      // Validate file size (5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (contentLength > MAX_SIZE) {
        throw new Error(`Image must be smaller than 5MB`);
      }

      // 1. Create pending asset in Replicache
      await rep.mutate.initAsset({
        assetId,
        contentType,
        contentLength,
        now: new Date(),
      });

      // 2. Get presigned upload URL
      const { uploadUrl } = await requestUploadUrl.mutateAsync({
        assetId,
        contentType,
        contentLength,
      });

      // 3. Upload file directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: `PUT`,
        body: blob,
        headers: {
          "Content-Type": contentType,
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
