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
        `group w-full overflow-hidden rounded-xl bg-bg-high shadow` +
        (className == null ? `` : ` ${className}`)
      }
    >
      <View
        className={`
          h-28 w-full border border-transparent transition-colors duration-150

          group-hover:border-fg/10
        `}
      >
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

      <View
        className={`
          flex-row items-center gap-2 px-3 py-2 transition-colors duration-150

          group-hover:bg-fg/5
        `}
      >
        <Text
          className={
            `text-base/tighter font-medium text-fg flex-1` +
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
