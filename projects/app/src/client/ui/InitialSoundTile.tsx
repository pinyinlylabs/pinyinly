import { nullIfEmpty } from "@/util/unicode";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { FramedAssetImage } from "./ImageFrame";
import type { AssetId } from "@/data/model";
import type { ImageCrop } from "./imageCrop";

interface InitialSoundTileProps extends ViewProps {
  label: string;
  showLabel?: boolean;
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
  showLabel = true,
  name,
  image,
  ...props
}: InitialSoundTileProps) {
  return (
    <View
      {...props}
      className={
        `group w-full items-center` +
        (className == null
          ? ``
          : `
            ${className}
          `)
      }
    >
      <View
        className={
          `relative z-10 size-28 transition-colors duration-150` +
          (showLabel ? ` mb-5` : ` mb-2`) +
          ` group-hover:border-fg/10`
        }
      >
        <View
          className={`
            size-full overflow-hidden rounded-full border border-transparent bg-bg-high shadow
            transition-colors duration-150

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
              className={`size-full`}
            />
          )}
        </View>

        {showLabel ? (
          <View className="absolute inset-x-0 -bottom-4 z-10 items-center">
            <View
              className={`
                min-h-8 min-w-8 items-center justify-center rounded-full border border-fg/10
                bg-fg-loud px-2.5 shadow transition-all duration-150

                group-hover:brightness-110
              `}
            >
              <Text className="font-sans text-sm/none font-semibold text-bg">
                {label}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        className={`
          relative z-0 max-w-full rounded-xl px-3 py-2 transition-all duration-150

          group-hover:bg-bg-high/60
        `}
      >
        <Text
          className={
            `text-base/none font-medium text-fg` +
            (nullIfEmpty(name) == null ? ` text-fg/20` : ``)
          }
          numberOfLines={1}
        >
          {name ?? `_____`}
        </Text>
      </View>
    </View>
  );
}
