import { nullIfEmpty } from "@/util/unicode";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { FramedAssetImage } from "./ImageFrame";
import type { AssetId } from "@/data/model";
import type { ImageCrop } from "./imageCrop";

interface InitialSoundTileProps extends ViewProps {
  label: string;
  name: string | null;
  image: {
    assetId: AssetId;
    crop: ImageCrop;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export function InitialSoundTile({
  className,
  label,
  name,
  image,
  ...props
}: InitialSoundTileProps) {
  return (
    <View
      {...props}
      className={
        `group w-full items-center` + (className == null ? `` : ` ${className}`)
      }
    >
      <View
        className={`
          relative z-10 -mb-0.5 size-28 overflow-hidden rounded-full border border-transparent
          bg-bg-high shadow transition-colors duration-150

          group-hover:border-fg/10
        `}
      >
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
          transition-all duration-150

          group-hover:brightness-105
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
