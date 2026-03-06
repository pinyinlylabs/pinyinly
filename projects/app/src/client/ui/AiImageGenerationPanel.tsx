import type { AiImageStyleKind } from "@/client/aiImageStyle";
import { getAiImageStyleConfig } from "@/client/aiImageStyle";
import { getLocalImageAssetBase64 } from "@/client/assets/localImageAssets";
import { trpc } from "@/client/trpc";
import { useImageUploader } from "@/client/ui/hooks/useImageUploader";
import type { UserSettingKeyInput } from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { AssetId } from "@/data/model";
import type {
  UserSetting,
  UserSettingImageEntity,
  UserSettingTextEntity,
} from "@/data/userSettings";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

type GeneratedImageFormat = `png` | `jpeg` | `webp`;

/**
 * Declarative reference to an image setting that will be lazily resolved during AI generation.
 * Labels can be either static strings or fetched from a UserSettingTextEntity.
 */
export interface AiReferenceImageDeclaration {
  imageSetting: UserSetting<UserSettingImageEntity>;
  imageSettingKey: UserSettingKeyInput<UserSettingImageEntity>;
  label:
    | string
    | {
        setting: UserSetting<UserSettingTextEntity>;
        key: UserSettingKeyInput<UserSettingTextEntity>;
      };
}

export interface AiImageGenerationPanelProps {
  initialPrompt?: string;
  aiImageStyle?: AiImageStyleKind | null;
  aiReferenceImages?: AiReferenceImageDeclaration[];
  onImageGenerated: (assetId: AssetId) => void;
  onError?: (message: string) => void;
  onSavePrompt?: (prompt: string) => void;
}

export function AiImageGenerationPanel({
  initialPrompt = ``,
  aiImageStyle = null,
  aiReferenceImages,
  onImageGenerated,
  onError,
  onSavePrompt,
}: AiImageGenerationPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<
    string | null
  >(null);
  const [generatedImageFormat, setGeneratedImageFormat] =
    useState<GeneratedImageFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingStyle, setIsLoadingStyle] = useState(false);

  // Destructure up to 3 reference images
  const [aiReferenceImage1, aiReferenceImage2, aiReferenceImage3] =
    aiReferenceImages ?? [];

  // Fetch reference image data using static hook calls
  const reference1ImageSetting = useUserSetting(
    aiReferenceImage1 == null
      ? { skip: true }
      : {
          setting: aiReferenceImage1.imageSetting,
          key: aiReferenceImage1.imageSettingKey,
        },
  );
  const reference1LabelSetting = useUserSetting(
    aiReferenceImage1 == null || typeof aiReferenceImage1.label !== `object`
      ? { skip: true }
      : {
          setting: aiReferenceImage1.label.setting,
          key: aiReferenceImage1.label.key,
        },
  );

  const reference2ImageSetting = useUserSetting(
    aiReferenceImage2 == null
      ? { skip: true }
      : {
          setting: aiReferenceImage2.imageSetting,
          key: aiReferenceImage2.imageSettingKey,
        },
  );
  const reference2LabelSetting = useUserSetting(
    aiReferenceImage2 == null || typeof aiReferenceImage2.label !== `object`
      ? { skip: true }
      : {
          setting: aiReferenceImage2.label.setting,
          key: aiReferenceImage2.label.key,
        },
  );

  const reference3ImageSetting = useUserSetting(
    aiReferenceImage3 == null
      ? { skip: true }
      : {
          setting: aiReferenceImage3.imageSetting,
          key: aiReferenceImage3.imageSettingKey,
        },
  );
  const reference3LabelSetting = useUserSetting(
    aiReferenceImage3 == null || typeof aiReferenceImage3.label !== `object`
      ? { skip: true }
      : {
          setting: aiReferenceImage3.label.setting,
          key: aiReferenceImage3.label.key,
        },
  );

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
      // Build reference images array
      const referenceImages: Array<{ label: string; imageData: string }> = [];

      // Add style image as first reference if selected
      if (aiImageStyle != null) {
        const config = getAiImageStyleConfig(aiImageStyle);
        const styleImageData = await loadStyleImageData(config.assetId);

        if (styleImageData == null) {
          return;
        }

        referenceImages.push({
          label: config.stylePrompt,
          imageData: styleImageData,
        });
      }

      // Process reference 1
      const ref1ImageId = reference1ImageSetting?.value?.imageId;
      if (aiReferenceImage1 != null && ref1ImageId != null) {
        const imageData = await getLocalImageAssetBase64(ref1ImageId);
        if (imageData != null) {
          const label =
            typeof aiReferenceImage1.label === `string`
              ? aiReferenceImage1.label
              : (reference1LabelSetting?.value?.text ?? `Reference 1`);
          referenceImages.push({
            label,
            imageData: `${imageData.mimeType};base64,${imageData.data}`,
          });
        }
      }

      // Process reference 2
      const ref2ImageId = reference2ImageSetting?.value?.imageId;
      if (aiReferenceImage2 != null && ref2ImageId != null) {
        const imageData = await getLocalImageAssetBase64(ref2ImageId);
        if (imageData != null) {
          const label =
            typeof aiReferenceImage2.label === `string`
              ? aiReferenceImage2.label
              : (reference2LabelSetting?.value?.text ?? `Reference 2`);
          referenceImages.push({
            label,
            imageData: `${imageData.mimeType};base64,${imageData.data}`,
          });
        }
      }

      // Process reference 3
      const ref3ImageId = reference3ImageSetting?.value?.imageId;
      if (aiReferenceImage3 != null && ref3ImageId != null) {
        const imageData = await getLocalImageAssetBase64(ref3ImageId);
        if (imageData != null) {
          const label =
            typeof aiReferenceImage3.label === `string`
              ? aiReferenceImage3.label
              : (reference3LabelSetting?.value?.text ?? `Reference 3`);
          referenceImages.push({
            label,
            imageData: `${imageData.mimeType};base64,${imageData.data}`,
          });
        }
      }

      const result = await generateMutation.mutateAsync({
        prompt: prompt.trim(),
        referenceImages:
          referenceImages.length > 0 ? referenceImages : undefined,
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
