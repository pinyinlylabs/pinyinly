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
        `w-full items-center` + (className == null ? `` : ` ${className}`)
      }
    >
      <View className="relative z-10 -mb-0.5 size-28 overflow-hidden rounded-full bg-bg-high shadow">
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

      <View
        className={`
          relative z-0 max-w-full flex-row items-center gap-2 rounded-xl bg-bg-high px-3 py-2
        `}
      >
        <Text
          className={
            `text-base/none text-fg font-medium` +
            (nullIfEmpty(name) == null ? ` text-fg/20` : ``)
          }
          numberOfLines={1}
        >
          {name ?? `_____`}
        </Text>

        <Text className="font-sans text-sm/none text-fg-dim">{label}</Text>
      </View>
    </View>
  );
}
