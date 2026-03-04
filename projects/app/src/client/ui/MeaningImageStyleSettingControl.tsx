import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { FramedAssetImage } from "@/client/ui/ImageFrame";
import {
  getMeaningImageStyle,
  meaningImageStyleOptions,
  normalizeMeaningImageStyleKind,
} from "@/client/ui/meaningImageStyles";
import { useAssetImageMeta } from "@/client/ui/useAssetImageMeta";
import { hanziWordMeaningAiImageStyleSetting } from "@/data/userSettings";
import { Pressable, Text, View } from "react-native";

export function MeaningImageStyleSettingControl() {
  const styleSetting = useUserSetting(hanziWordMeaningAiImageStyleSetting);
  const selectedStyleKind = normalizeMeaningImageStyleKind(
    styleSetting.value?.text,
  );

  return (
    <View className="gap-3">
      <Text className="pyly-body-heading">AI meaning image style</Text>
      <Text className="pyly-body-caption">
        Used for generated meaning mnemonic images in Recognize the character.
      </Text>

      <View className="flex-row gap-3">
        {meaningImageStyleOptions.map((option) => (
          <MeaningImageStyleOptionCard
            key={option.kind}
            styleKind={option.kind}
            isSelected={selectedStyleKind === option.kind}
            onSelect={() => {
              styleSetting.setValue({ text: option.kind });
            }}
          />
        ))}
      </View>
    </View>
  );
}

function MeaningImageStyleOptionCard({
  styleKind,
  isSelected,
  onSelect,
}: {
  styleKind: (typeof meaningImageStyleOptions)[number][`kind`];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const style = getMeaningImageStyle(styleKind);
  const styleImageMeta = useAssetImageMeta(style.assetId, null, null);

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
            assetId={style.assetId}
            crop={{ kind: `rect`, rect: style.thumbnailCropRect }}
            imageWidth={styleImageMeta.imageSize?.width ?? null}
            imageHeight={styleImageMeta.imageSize?.height ?? null}
            className="size-full"
          />
        </View>
        <Text className="pyly-body text-center">{style.label}</Text>
      </View>
    </Pressable>
  );
}
