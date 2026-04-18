import { nullIfEmpty } from "@/util/unicode";
import { Text, View } from "react-native";
import type { PinyinSoundTileProps } from "./BaseSoundTile";
import { FramedAssetImage } from "./ImageFrame";

export function InitialSoundTile({
  className,
  label,
  name,
  image,
  ...props
}: PinyinSoundTileProps) {
  return (
    <View
      {...props}
      className={
        `w-full items-center gap-2.5` +
        (className == null ? `` : ` ${className}`)
      }
    >
      <View className="relative size-28 overflow-hidden rounded-full bg-bg-high">
        {image == null ? null : (
          <FramedAssetImage
            assetId={image.assetId}
            crop={image.crop}
            imageWidth={image.imageWidth}
            imageHeight={image.imageHeight}
            frameShape="circle"
            className="size-full"
          />
        )}
      </View>

      <View className="w-full items-center rounded-lg bg-bg-high px-2 py-1.5">
        <Text className="font-sans text-2xl leading-none text-fg">{label}</Text>
      </View>

      {name == null ? (
        <Text
          className="select-none overflow-visible leading-none text-fg/20"
          numberOfLines={1}
        >
          _____
        </Text>
      ) : (
        <Text
          className={
            `overflow-visible leading-none text-fg-dim` +
            (nullIfEmpty(name) == null ? ` text-fg/20` : ``)
          }
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
}
