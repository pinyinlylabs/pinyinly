import { trpc } from "@/client/trpc";
import { useImageUploader } from "@/client/ui/hooks/useImageUploader";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

type GeneratedImageFormat = `png` | `jpeg` | `webp`;

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
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<
    string | null
  >(null);
  const [generatedImageFormat, setGeneratedImageFormat] =
    useState<GeneratedImageFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const generateMutation = trpc.ai.generateHintImage.useMutation();

  const { uploading, uploadImageBlob } = useImageUploader({
    onUploadComplete: (assetId) => {
      onConfirm(assetId);
    },
    onUploadError: (errorMessage) => {
      setError(errorMessage);
      setIsConfirming(false);
    },
  });

  const handleGenerate = async () => {
    if (prompt.trim().length === 0) {
      setError(`Please enter a prompt`);
      return;
    }

    setError(null);
    setGeneratedImageDataUrl(null);
    setGeneratedImageFormat(null);

    try {
      const result = await generateMutation.mutateAsync({
        prompt: prompt.trim(),
      });
      setGeneratedImageDataUrl(result.imageDataUrl);
      setGeneratedImageFormat(result.format as GeneratedImageFormat);
    } catch (err) {
      console.error(`AI image generation failed:`, err);
      setError(`Unable to generate image right now.`);
    }
  };

  const handleConfirm = async () => {
    if (generatedImageDataUrl == null || generatedImageFormat == null) {
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(generatedImageDataUrl);
      const blob = await response.blob();

      // Save prompt if callback provided
      onSavePrompt?.(prompt.trim());

      // Upload to R2
      await uploadImageBlob({
        blob,
        contentType: `image/${generatedImageFormat}`,
      });
    } catch (err) {
      console.error(`Failed to confirm image:`, err);
      setError(`Failed to save image`);
      setIsConfirming(false);
    }
  };

  const isGenerating = generateMutation.isPending;
  const isProcessing = isGenerating || uploading || isConfirming;
  const hasGenerated = generatedImageDataUrl != null;

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
              AI image creator
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                void handleConfirm();
              }}
              disabled={!hasGenerated || isProcessing}
            >
              Confirm
            </RectButton>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
            <View className="gap-1">
              <Text className="pyly-body-subheading">Image prompt</Text>
              <Text className="text-[14px] text-fg-dim">
                Describe the image you want to generate for this hint
              </Text>
            </View>

            <TextInputSingle
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe the image..."
              multiline
              numberOfLines={4}
              editable={!isProcessing}
            />

            <View className="flex-row items-center justify-end gap-2">
              <RectButton
                variant="filled"
                onPress={() => {
                  void handleGenerate();
                }}
                disabled={isProcessing || prompt.trim().length === 0}
              >
                {hasGenerated ? `Regenerate` : `Generate`}
              </RectButton>
            </View>

            {error == null ? null : (
              <Text className="text-[14px] text-[crimson]">{error}</Text>
            )}

            {isGenerating ? (
              <Text className="text-[14px] text-fg-dim">
                Generating image...
              </Text>
            ) : null}

            {hasGenerated && generatedImageDataUrl != null ? (
              <View className="gap-2">
                <Text className="pyly-body-subheading">Preview</Text>
                <View className="items-center rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
                  <Image
                    source={{ uri: generatedImageDataUrl }}
                    style={{ width: 300, height: 150 }}
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-[13px] text-fg-dim">
                  Review the image and click Confirm to save it, or Regenerate
                  to try again with the same or different prompt.
                </Text>
              </View>
            ) : null}

            {isConfirming || uploading ? (
              <Text className="text-[14px] text-fg-dim">Saving image...</Text>
            ) : null}
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
