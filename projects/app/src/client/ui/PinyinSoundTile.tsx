import type { AssetId, PinyinSoundId } from "@/data/model";
import { nullIfEmpty } from "@/util/unicode";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { FramedAssetImage } from "./ImageFrame";
import type { ImageCrop } from "./imageCrop";

interface PinyinSoundProps {
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

export function PinyinSoundTile({
  id,
  name,
  label,
  image,
  ...props
}: PinyinSoundProps) {
  true satisfies IsExhaustedRest<typeof props>;

  const decoration = decorationForSound(id);

  return (
    <View
      {...props}
      className={tileClass({
        hasAssociation: nullIfEmpty(name) != null,
      })}
    >
      {image == null ? null : (
        <View className="absolute inset-0">
          <FramedAssetImage
            assetId={image.assetId}
            crop={image.crop}
            imageWidth={image.imageWidth}
            imageHeight={image.imageHeight}
            className="size-full"
          />
          <View className="absolute inset-0 bg-bg-high/70" />
        </View>
      )}
      <View className="items-center">
        {decoration == null ? null : (
          <Text
            className={`-top-4 h-0 pt-2 text-4xl font-normal leading-none text-fg/20`}
          >
            {decoration}
          </Text>
        )}
        <Text className="text-2xl leading-none text-fg">{label}</Text>
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
    relative h-28 w-24 items-center justify-center gap-3 overflow-hidden rounded-xl bg-bg-high p-2

    hover:bg-cyan/20
  `,
  variants: {
    hasAssociation: {
      true: ``,
    },
  },
});

function decorationForSound(soundId: PinyinSoundId): string | null {
  switch (soundId) {
    case `1`: {
      return `¯`;
    }
    case `2`: {
      return `´`;
    }
    case `3`: {
      return `ˇ`;
    }
    case `4`: {
      return `\``;
    }
    case `5`: {
      return ``;
    }
    default: {
      return null;
    }
  }
}
