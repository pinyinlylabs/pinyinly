import { ExampleStack } from "@/client/ui/demo/components";
import { ImageUploadButton } from "@/client/ui/ImageUploadButton";
import { useState } from "react";
import { Text, View } from "react-native";

export default () => {
  const [lastAssetId, setLastAssetId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <View className="gap-3">
      <ExampleStack title="upload button" showFrame>
        <ImageUploadButton
          onUploadComplete={(assetId) => {
            setLastAssetId(assetId);
            setLastError(null);
          }}
          onUploadError={(error) => {
            setLastError(error);
          }}
          buttonText="Pick image"
        />
      </ExampleStack>

      <View className="gap-1">
        <Text className="text-[12px] text-fg-dim">
          {lastAssetId == null
            ? `No upload yet`
            : `Last upload: ${lastAssetId}`}
        </Text>
        {lastError == null ? null : (
          <Text className="text-[12px] text-danger">{lastError}</Text>
        )}
      </View>
    </View>
  );
};
