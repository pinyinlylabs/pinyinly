import { ExampleStack } from "@/client/ui/demo/components";
import { ImagePasteDropZone } from "@/client/ui/ImagePasteDropZone";
import { useState } from "react";
import { Text, View } from "react-native";

export default () => {
  const [lastAssetId, setLastAssetId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <View className="gap-3">
      <ExampleStack title="paste or upload" showFrame>
        <View className="w-[320px]">
          <ImagePasteDropZone
            onUploadComplete={(assetId) => {
              setLastAssetId(assetId);
              setLastError(null);
            }}
            onUploadError={(error) => {
              setLastError(error);
            }}
          />
        </View>
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
