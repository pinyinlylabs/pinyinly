import type { AiImageStyleKind } from "@/client/aiImageStyle";
import { getAiImageStyleConfig } from "@/client/aiImageStyle";
import { getLocalImageAssetBase64 } from "@/client/assets/localImageAssets";
import { trpc } from "@/client/trpc";
import { useImageUploader } from "@/client/ui/hooks/useImageUploader";
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

import type { AssetId } from "@/data/model";

type GeneratedImageFormat = `png` | `jpeg` | `webp`;

export interface AiImageGenerationPanelProps {
  initialPrompt?: string;
  aiImageStyle?: AiImageStyleKind | null;
  onImageGenerated: (assetId: AssetId) => void;
  onError?: (message: string) => void;
  onSavePrompt?: (prompt: string) => void;
}

export function AiImageGenerationPanel({
  initialPrompt = ``,
  aiImageStyle = null,
  onImageGenerated,
  onError,
  onSavePrompt,
}: AiImageGenerationPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [styleImageData, setStyleImageData] = useState<string | null>(null);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<
    string | null
  >(null);
  const [generatedImageFormat, setGeneratedImageFormat] =
    useState<GeneratedImageFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingStyle, setIsLoadingStyle] = useState(false);

  const generateMutation = trpc.ai.generateHintImage.useMutation();

  const { uploading, uploadImageBlob } = useImageUploader({
    onUploadComplete: (assetId) => {
      onImageGenerated(assetId);
    },
    onUploadError: (errorMessage) => {
      setError(errorMessage);
      onError?.(errorMessage);
      setIsConfirming(false);
    },
  });

  const loadStyleImageData = async (
    assetId: AssetId,
  ): Promise<string | null> => {
    setIsLoadingStyle(true);
    setError(null);

    try {
      const result = await getLocalImageAssetBase64(assetId);
      if (result == null) {
        setError(`Failed to load style image`);
        onError?.(`Failed to load style image`);
        return null;
      }

      // Combine base64 data with MIME type
      const base64WithMimeType = `${result.mimeType};base64,${result.data}`;
      setStyleImageData(base64WithMimeType);
      return base64WithMimeType;
    } catch (err) {
      console.error(`Failed to load style image:`, err);
      setError(`Failed to load style image`);
      onError?.(`Failed to load style image`);
      return null;
    } finally {
      setIsLoadingStyle(false);
    }
  };

  const handleGenerate = async () => {
    if (prompt.trim().length === 0) {
      setError(`Please enter a prompt`);
      onError?.(`Please enter a prompt`);
      return;
    }

    setError(null);
    setGeneratedImageDataUrl(null);
    setGeneratedImageFormat(null);

    try {
      let effectiveStyleImageData: string | undefined;
      let stylePromptText = ``;

      if (aiImageStyle != null) {
        const config = getAiImageStyleConfig(aiImageStyle);
        stylePromptText = config.stylePrompt;
        effectiveStyleImageData =
          styleImageData ??
          (await loadStyleImageData(config.assetId)) ??
          undefined;

        if (effectiveStyleImageData == null) {
          return;
        }
      }

      const fullPrompt =
        prompt.trim() + (stylePromptText ? `\n\n${stylePromptText}` : ``);

      const result = await generateMutation.mutateAsync({
        prompt: fullPrompt,
        styleImageData: effectiveStyleImageData,
      });
      setGeneratedImageDataUrl(result.imageDataUrl);
      setGeneratedImageFormat(result.format);
    } catch (err) {
      console.error(`AI image generation failed:`, err);
      const errorMsg = `Unable to generate image right now.`;
      setError(errorMsg);
      onError?.(errorMsg);
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

      // Upload to S3
      await uploadImageBlob({
        blob,
        contentType: `image/${generatedImageFormat}`,
      });
    } catch (err) {
      console.error(`Failed to confirm image:`, err);
      const errorMsg = `Failed to save image`;
      setError(errorMsg);
      onError?.(errorMsg);
      setIsConfirming(false);
    }
  };

  const isGenerating = generateMutation.isPending;
  const isProcessing =
    isGenerating || uploading || isConfirming || isLoadingStyle;
  const hasGenerated = generatedImageDataUrl != null;

  useEffect(() => {
    if (aiImageStyle == null) {
      setStyleImageData(null);
      return;
    }

    let isActive = true;

    const preloadStyle = async () => {
      setIsLoadingStyle(true);
      try {
        const styleInfo = getAiImageStyleConfig(aiImageStyle);
        const result = await getLocalImageAssetBase64(styleInfo.assetId);
        if (!isActive || result == null) {
          return;
        }
        setStyleImageData(`${result.mimeType};base64,${result.data}`);
      } finally {
        if (isActive) {
          setIsLoadingStyle(false);
        }
      }
    };

    void preloadStyle();

    return () => {
      isActive = false;
    };
  }, [aiImageStyle]);

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
      <View className="gap-1">
        <Text className="pyly-body-subheading">Image prompt</Text>
        <Text className="text-[14px] text-fg-dim">
          Describe the image you want to generate
        </Text>
      </View>

      <TextInputSingle
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Describe the image..."
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
        <Text className="text-[14px] text-fg-dim">Generating image...</Text>
      ) : null}

      {isLoadingStyle ? (
        <Text className="text-[14px] text-fg-dim">Loading style image...</Text>
      ) : null}

      {hasGenerated ? (
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
            Review the image and click Generate to save it, or Regenerate to try
            again with the same or different prompt.
          </Text>
          <RectButton
            variant="filled"
            onPress={() => {
              void handleConfirm();
            }}
            disabled={isProcessing}
          >
            Generate
          </RectButton>
        </View>
      ) : null}

      {isConfirming || uploading ? (
        <Text className="text-[14px] text-fg-dim">Saving image...</Text>
      ) : null}
    </ScrollView>
  );
}
