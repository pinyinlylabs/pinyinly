import { nullIfEmpty } from "@/util/unicode";
import { Text, View } from "react-native";
import type { PinyinSoundTileProps } from "./BaseSoundTile";
import { FramedAssetImage } from "./ImageFrame";

export function FinalSoundTile({
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
        `w-full overflow-hidden rounded-xl bg-bg-high shadow` +
        (className == null ? `` : ` ${className}`)
      }
    >
      <View className="h-28 w-full">
        {image == null ? null : (
          <FramedAssetImage
            assetId={image.assetId}
            crop={image.crop}
            imageWidth={image.imageWidth}
            imageHeight={image.imageHeight}
            frameShape="rect"
            className="size-full"
          />
        )}
      </View>

      <View className="flex-row items-center gap-2 px-3 py-2">
        <Text
          className={
            `text-base/none font-medium text-fg` +
            (nullIfEmpty(name) == null ? ` text-fg/20` : ``)
          }
          numberOfLines={1}
        >
          {name ?? `_____`}
        </Text>

        <Text className="shrink-0 font-sans text-sm/none text-fg-dim">
          {label}
        </Text>
      </View>
    </View>
  );
}
