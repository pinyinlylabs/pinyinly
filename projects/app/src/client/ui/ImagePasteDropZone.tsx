import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Image as RnImage,
  Text,
  View,
} from "react-native";
import { useImageUploader } from "./hooks/useImageUploader";

interface ImagePasteDropZoneProps {
  onUploadComplete: (assetId: string) => void;
  onUploadError?: (error: string) => void;
}

export function ImagePasteDropZone({
  onUploadComplete,
  onUploadError,
}: ImagePasteDropZoneProps) {
  "use memo";

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hasPreview = previewUrl != null && previewUrl.length > 0;

  const handleUploadComplete = (assetId: string) => {
    setPreviewUrl((current) => {
      if (current != null && current.length > 0) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    onUploadComplete(assetId);
  };

  const handleUploadError = useCallback(
    (error: string) => {
      onUploadError?.(error);
    },
    [onUploadError],
  );

  const { uploading, uploadImageBlob, uploadImagePickerAsset } =
    useImageUploader({
      onUploadComplete: handleUploadComplete,
      onUploadError: handleUploadError,
    });

  useEffect(() => {
    if (Platform.OS !== `web` || typeof window === `undefined`) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (uploading) {
        return;
      }

      const clipboardData = event.clipboardData;
      const items = clipboardData?.items ? Array.from(clipboardData.items) : [];
      const fileItem = items.find(
        (item) => item.kind === `file` && item.type.startsWith(`image/`),
      );
      const fileFromItems = fileItem?.getAsFile() ?? null;
      const fileFromFiles = clipboardData?.files
        ? Array.from(clipboardData.files).find((file) =>
            file.type.startsWith(`image/`),
          )
        : null;
      const file = fileFromItems ?? fileFromFiles;

      if (file == null) {
        handleUploadError(`Clipboard does not contain an image`);
        return;
      }

      event.preventDefault();
      const nextPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl((current) => {
        if (current != null && current.length > 0) {
          URL.revokeObjectURL(current);
        }
        return nextPreviewUrl;
      });
      void uploadImageBlob({ blob: file, contentType: file.type });
    };

    window.addEventListener(`paste`, handlePaste);
    return () => {
      window.removeEventListener(`paste`, handlePaste);
    };
  }, [handleUploadError, uploadImageBlob, uploading]);

  useEffect(() => {
    return () => {
      if (previewUrl != null && previewUrl.length > 0) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== `granted`) {
      handleUploadError(`Permission to access media library is required`);
      return;
    }

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

  if (Platform.OS !== `web`) {
    return null;
  }

  return (
    <Pressable
      onPress={() => {
        void handlePickImage();
      }}
      className={`
        items-center justify-center gap-2 rounded-lg border border-dashed border-fg/20 bg-fg/5 px-3
        py-4
      `}
    >
      {hasPreview ? (
        <View className="items-center gap-2">
          <View className="size-28 overflow-hidden rounded-md border border-fg/10">
            <RnImage
              source={{ uri: previewUrl }}
              className="size-full"
              resizeMode="cover"
            />
          </View>
          <Text className="text-[12px] text-fg-dim">
            {uploading ? `Uploading...` : `Pasted preview`}
          </Text>
        </View>
      ) : uploading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" className="text-fg" />
          <Text className="text-[13px] text-fg">Uploading image...</Text>
        </View>
      ) : (
        <View className="items-center gap-1">
          <Text className="text-[13px] text-fg">
            Click to upload or paste an image anytime
          </Text>
          <Text className="text-[12px] text-fg-dim">Web only</Text>
        </View>
      )}
    </Pressable>
  );
}
