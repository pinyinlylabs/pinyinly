import { useState } from "react";
import { Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { AiImageGenerationPanel } from "./AiImageGenerationPanel";

export interface AiImageGenerationModalProps {
  initialPrompt: string;
  onConfirm: (assetId: string) => void;
  onDismiss: () => void;
  onSavePrompt?: (prompt: string) => void;
}

export function AiImageGenerationModal({
  initialPrompt,
  onConfirm,
  onDismiss,
  onSavePrompt,
}: AiImageGenerationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <PageSheetModal
      onDismiss={onDismiss}
      suspenseFallback={<Text>Loading...</Text>}
    >
      {({ dismiss }) => (
        <View className="flex-1 bg-bg">
          <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
            <RectButton
              variant="bare"
              onPress={dismiss}
              disabled={isProcessing}
            >
              Cancel
            </RectButton>
            <Text className="text-[17px] font-semibold text-fg-loud">
              AI image generator
            </Text>
            <View className="w-[60px]" />
          </View>

          <AiImageGenerationPanel
            initialPrompt={initialPrompt}
            onImageGenerated={(assetId) => {
              onConfirm(assetId);
            }}
            onError={(_errorMsg) => {
              setIsProcessing(false);
            }}
            onSavePrompt={onSavePrompt}
          />
        </View>
      )}
    </PageSheetModal>
  );
}
