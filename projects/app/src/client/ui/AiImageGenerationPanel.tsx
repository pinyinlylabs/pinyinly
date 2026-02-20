import {
  getAvailableLocalImageAssets,
  getLocalImageAssetBase64,
  getLocalImageAssetSource,
} from "@/client/assets/localImageAssets";
import { trpc } from "@/client/trpc";
import { useImageUploader } from "@/client/ui/hooks/useImageUploader";
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

import type { LocalImageAssetId } from "@/client/assets/localImageAssets";
import type { ImageSourcePropType } from "react-native";

type GeneratedImageFormat = `png` | `jpeg` | `webp`;

export interface AiImageGenerationPanelProps {
  initialPrompt?: string;
  onImageGenerated: (assetId: string) => void;
  onError?: (message: string) => void;
  onSavePrompt?: (prompt: string) => void;
}

export function AiImageGenerationPanel({
  initialPrompt = ``,
  onImageGenerated,
  onError,
  onSavePrompt,
}: AiImageGenerationPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyleAssetId, setSelectedStyleAssetId] =
    useState<LocalImageAssetId | null>(null);
  const [styleImageData, setStyleImageData] = useState<string | null>(null);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<
    string | null
  >(null);
  const [generatedImageFormat, setGeneratedImageFormat] =
    useState<GeneratedImageFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingStyle, setIsLoadingStyle] = useState(false);
  const [stylePreviewSources, setStylePreviewSources] = useState<
    Partial<Record<LocalImageAssetId, ImageSourcePropType>>
  >({});
  const [availableImages] = useState(() => getAvailableLocalImageAssets());

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

  const handleSelectStyleImage = async (assetId: LocalImageAssetId) => {
    setIsLoadingStyle(true);
    setError(null);

    try {
      const result = await getLocalImageAssetBase64(assetId);
      if (result == null) {
        setError(`Failed to load style image`);
        setIsLoadingStyle(false);
        return;
      }

      // Combine base64 data with MIME type
      const base64WithMimeType = `${result.mimeType};base64,${result.data}`;
      setStyleImageData(base64WithMimeType);
      setSelectedStyleAssetId(assetId);
      setShowStyleSelector(false);
    } catch (err) {
      console.error(`Failed to select style image:`, err);
      setError(`Failed to load style image`);
      onError?.(`Failed to load style image`);
    } finally {
      setIsLoadingStyle(false);
    }
  };

  const handleClearStyleImage = () => {
    setSelectedStyleAssetId(null);
    setStyleImageData(null);
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
      const result = await generateMutation.mutateAsync({
        prompt: prompt.trim(),
        styleImageData: styleImageData ?? undefined,
      });
      setGeneratedImageDataUrl(result.imageDataUrl);
      setGeneratedImageFormat(result.format as GeneratedImageFormat);
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

      // Upload to R2
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
    if (!showStyleSelector) {
      return;
    }

    let isActive = true;

    const loadPreviews = async () => {
      const entries = await Promise.all(
        availableImages.map(async (assetId) => {
          const source = await getLocalImageAssetSource(assetId);
          return [assetId, source] as const;
        }),
      );

      if (!isActive) {
        return;
      }

      setStylePreviewSources((previous) => {
        const next = { ...previous };
        for (const [assetId, source] of entries) {
          if (source != null) {
            next[assetId] = source as ImageSourcePropType;
          }
        }
        return next;
      });
    };

    void loadPreviews();

    return () => {
      isActive = false;
    };
  }, [availableImages, showStyleSelector]);

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

      {/* Style Image Selector */}
      <View className="gap-2">
        <Text className="pyly-body-subheading">Style image</Text>
        <Text className="text-[14px] text-fg-dim">
          (Optional) Choose an image to use as a style reference
        </Text>

        {selectedStyleAssetId != null && styleImageData != null ? (
          <View className="gap-2">
            <View className="items-center rounded-lg border border-fg-bg10 bg-fg-bg5 p-2">
              <Image
                source={{
                  uri: `data:${styleImageData}`,
                }}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-[13px] text-fg-dim">
              Selected: {selectedStyleAssetId}
            </Text>
            <RectButton
              variant="filled"
              onPress={handleClearStyleImage}
              disabled={isProcessing}
            >
              Clear style image
            </RectButton>
          </View>
        ) : (
          <RectButton
            variant="filled"
            onPress={() => {
              setShowStyleSelector(!showStyleSelector);
            }}
            disabled={isProcessing}
          >
            Choose style image
          </RectButton>
        )}

        {showStyleSelector && (
          <View className="gap-2 rounded-lg bg-fg-bg5 p-3">
            {availableImages.length === 0 ? (
              <Text className="text-[13px] text-fg-dim">
                No style images available
              </Text>
            ) : (
              <>
                <Text className="text-[13px] font-semibold text-fg-dim">
                  Available styles:
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {availableImages.map((assetId) => (
                    <RectButton
                      key={assetId}
                      variant="outline"
                      className="w-[150px]"
                      onPress={() => {
                        void handleSelectStyleImage(assetId);
                      }}
                      disabled={isProcessing}
                    >
                      <View className="gap-2">
                        <View
                          className={`items-center rounded-lg border border-fg-bg10 bg-fg-bg5 p-2`}
                        >
                          {stylePreviewSources[assetId] == null ? (
                            <Text className="text-[11px] text-fg-dim">
                              Loading...
                            </Text>
                          ) : (
                            <Image
                              source={stylePreviewSources[assetId]}
                              style={{ width: 100, height: 80 }}
                              resizeMode="cover"
                            />
                          )}
                        </View>
                        <Text className="text-[12px] text-fg-dim">
                          {assetId}
                        </Text>
                      </View>
                    </RectButton>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </View>

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
            Review the image and click Generate to save it, or Regenerate to try
            again with the same or different prompt.
          </Text>
          <RectButton
            variant="filled"
            onPress={() => {
              void handleConfirm();
            }}
            disabled={!hasGenerated || isProcessing}
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
