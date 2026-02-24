import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Text } from "react-native";
import { Icon } from "./Icon";
import { RectButton } from "./RectButton";
import { useImageUploader } from "./hooks/useImageUploader";

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
          <Icon size={16} icon="puzzle" className="text-fg" />
          <Text className="text-fg">{buttonText}</Text>
        </>
      )}
    </RectButton>
  );
}
