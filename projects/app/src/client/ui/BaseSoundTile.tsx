import type { AssetId, PinyinSoundId } from "@/data/model";
import { nullIfEmpty } from "@/util/unicode";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { FramedAssetImage } from "./ImageFrame";
import type { ImageCrop, ImageFrameShape } from "./imageCrop";

export interface PinyinSoundTileProps extends ViewProps {
  id: PinyinSoundId;
  label: string;
  name: string | null;
  image: {
    assetId: AssetId;
    crop: ImageCrop;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

interface BaseSoundTileProps {
  decoration?: string | null;
  frameShape: ImageFrameShape;
  image: PinyinSoundTileProps[`image`];
  label: string;
  name: string | null;
  size: `rect` | `square`;
}

type BaseSoundTileViewProps = Omit<
  PinyinSoundTileProps,
  `id` | `image` | `label` | `name`
>;

export function BaseSoundTile({
  className,
  decoration = null,
  frameShape,
  image,
  label,
  name,
  size,
  ...props
}: BaseSoundTileProps & BaseSoundTileViewProps) {
  return (
    <View
      {...props}
      className={
        tileClass({
          hasAssociation: nullIfEmpty(name) != null,
          size,
        }) + (className == null ? `` : ` ${className}`)
      }
    >
      {image == null ? null : (
        <View className="absolute inset-0">
          <FramedAssetImage
            assetId={image.assetId}
            crop={image.crop}
            imageWidth={image.imageWidth}
            imageHeight={image.imageHeight}
            frameShape={frameShape}
            className="size-full"
          />
          <View className="absolute inset-0 bg-bg-high/70" />
        </View>
      )}
      <View className="items-center">
        {decoration == null ? null : (
          <Text className="-top-4 h-0 pt-2 text-4xl font-normal leading-none text-fg/20">
            {decoration}
          </Text>
        )}
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
          className="overflow-visible leading-none text-fg-dim"
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
}

const tileClass = tv({
  base: `
    relative items-center justify-center gap-3 overflow-hidden rounded-xl bg-bg-high p-2

    hover:bg-cyan/20
  `,
  variants: {
    hasAssociation: {
      true: ``,
    },
    size: {
      rect: `h-28 w-24`,
      square: `size-28`,
    },
  },
});
