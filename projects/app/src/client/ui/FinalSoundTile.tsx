import { nullIfEmpty } from "@/util/unicode";
import type { ViewProps } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { FramedAssetImage } from "./ImageFrame";
import type { AssetId } from "@/data/model";
import type { ImageCrop } from "./imageCrop";

interface FinalSoundTileProps extends ViewProps {
  badge?: string;
  name: string | null;
  image: {
    assetId: AssetId;
    crop: ImageCrop;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export function FinalSoundTile({
  className,
  badge,
  name,
  image,
  ...props
}: FinalSoundTileProps) {
  const hasBadge = nullIfEmpty(badge) != null;

  return (
    <View
      {...props}
      className={
        `group items-center` +
        (className == null
          ? ``
          : `
            ${className}
          `)
      }
    >
      <View
        className={`
          relative z-10 size-[180px] transition-colors duration-150

          ${hasBadge ? `mb-5` : `mb-2`}

          group-hover:border-fg/10
        `}
      >
        <View
          className={`
            size-full overflow-hidden rounded-xl border border-transparent bg-bg-high shadow
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
              frameShape="rect"
              className="size-full"
            />
          )}
        </View>

        {hasBadge ? (
          <View className="absolute inset-x-0 -bottom-4 z-10 items-center">
            <View
              className={`
                min-h-8 min-w-8 items-center justify-center rounded-full border border-fg/10
                bg-fg-loud px-2.5 shadow transition-all duration-150

                group-hover:brightness-110
              `}
            >
              <Text className="font-sans text-sm/none font-semibold text-bg">
                {badge}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        className={`
          relative z-0 max-w-full rounded-lg px-3 py-2

          group-hover:bg-fg/10
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
