import type { AiImageStyleKind } from "@/client/aiImageStyle";
import { getAiImageStyleConfig } from "@/client/aiImageStyle";
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
import { invariant } from "@pinyinly/lib/invariant";
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

  // Destructure up to 3 reference images
  const [aiReferenceImage1, aiReferenceImage2, aiReferenceImage3] =
    aiReferenceImages ?? [];

  invariant(
    (aiReferenceImages?.length ?? 0) <= 3,
    `A maximum of 3 reference images can be provided`,
  );

  // Fetch reference image data using static hook calls
  const reference1ImageSetting = useUserSetting(
    aiReferenceImage1 == null
      ? null
      : {
          setting: aiReferenceImage1.imageSetting,
          key: aiReferenceImage1.imageSettingKey,
        },
  );
  const reference1LabelSetting = useUserSetting(
    aiReferenceImage1 == null || typeof aiReferenceImage1.label !== `object`
      ? null
      : aiReferenceImage1.label,
  );

  const reference2ImageSetting = useUserSetting(
    aiReferenceImage2 == null
      ? null
      : {
          setting: aiReferenceImage2.imageSetting,
          key: aiReferenceImage2.imageSettingKey,
        },
  );
  const reference2LabelSetting = useUserSetting(
    aiReferenceImage2 == null || typeof aiReferenceImage2.label !== `object`
      ? null
      : aiReferenceImage2.label,
  );

  const reference3ImageSetting = useUserSetting(
    aiReferenceImage3 == null
      ? null
      : {
          setting: aiReferenceImage3.imageSetting,
          key: aiReferenceImage3.imageSettingKey,
        },
  );
  const reference3LabelSetting = useUserSetting(
    aiReferenceImage3 == null || typeof aiReferenceImage3.label !== `object`
      ? null
      : aiReferenceImage3.label,
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
      const referenceImages: Array<{ label?: string; assetId: AssetId }> = [];

      // Add style image as first reference if selected
      if (aiImageStyle != null) {
        const config = getAiImageStyleConfig(aiImageStyle);
        referenceImages.push({
          label: config.stylePrompt,
          assetId: config.assetId,
        });
      }

      // Process reference images
      const referenceSettings = [
        {
          declaration: aiReferenceImage1,
          imageSetting: reference1ImageSetting,
          labelSetting: reference1LabelSetting,
        },
        {
          declaration: aiReferenceImage2,
          imageSetting: reference2ImageSetting,
          labelSetting: reference2LabelSetting,
        },
        {
          declaration: aiReferenceImage3,
          imageSetting: reference3ImageSetting,
          labelSetting: reference3LabelSetting,
        },
      ];

      for (const {
        declaration,
        imageSetting,
        labelSetting,
      } of referenceSettings) {
        const refImageId = imageSetting?.value?.imageId;
        if (declaration != null && refImageId != null) {
          const label =
            typeof declaration.label === `string`
              ? declaration.label
              : labelSetting?.value?.text;
          referenceImages.push({ label, assetId: refImageId });
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
  const isProcessing = isGenerating || uploading || isConfirming;
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
