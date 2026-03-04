import type { AiImageStyleKind } from "@/client/aiImageStyle";
import {
  aiImageStyleConfigs,
  getAiImageStyleConfig,
} from "@/client/aiImageStyle";
import { useAiImageStyleSetting } from "@/client/ui/hooks/useAiImageStyleSetting";
import { FramedAssetImage } from "@/client/ui/ImageFrame";
import { useAssetImageMeta } from "@/client/ui/useAssetImageMeta";
import { Pressable, Text, View } from "react-native";

export function MeaningImageStyleSettingControl() {
  const { aiImageStyle, setAiImageStyle } = useAiImageStyleSetting();

  return (
    <View className="gap-3">
      <Text className="pyly-body-heading">AI image style</Text>
      <Text className="pyly-body-caption">
        Used for generated mnemonic images in both Recognize the character and
        Remember the pronunciation.
      </Text>

      <View className="flex-row gap-3">
        {aiImageStyleConfigs.map((config) => (
          <MeaningImageStyleOptionCard
            key={config.kind}
            aiImageStyle={config.kind}
            isSelected={aiImageStyle === config.kind}
            onSelect={() => {
              setAiImageStyle(config.kind);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function MeaningImageStyleOptionCard({
  aiImageStyle,
  isSelected,
  onSelect,
}: {
  aiImageStyle: AiImageStyleKind;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = getAiImageStyleConfig(aiImageStyle);
  const styleImageMeta = useAssetImageMeta(config.assetId, null, null);

  return (
    <Pressable onPress={onSelect}>
      <View className="gap-2">
        <View
          className={
            isSelected
              ? `size-20 overflow-hidden rounded-md border-2 border-blue bg-fg-bg10`
              : `size-20 overflow-hidden rounded-md bg-fg-bg10`
          }
        >
          <FramedAssetImage
            assetId={config.assetId}
            crop={{ kind: `rect`, rect: config.thumbnailCropRect }}
            imageWidth={styleImageMeta.imageSize?.width ?? null}
            imageHeight={styleImageMeta.imageSize?.height ?? null}
            className="size-full"
          />
        </View>
        <Text className="pyly-body text-center">{config.label}</Text>
      </View>
    </Pressable>
  );
}
