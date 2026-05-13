import type { PinyinSoundId, AssetId } from "@/data/model";
import { nullIfEmpty } from "@/util/unicode";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { FramedAssetImage } from "./ImageFrame";
import { ToneLabelText } from "./ToneLabelText";
import type { ImageCrop } from "./imageCrop";

interface ToneSoundTileProps extends ViewProps {
  soundId: PinyinSoundId;
  label: string;
  name: string | null;
  image: {
    assetId: AssetId;
    crop: ImageCrop;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export function ToneSoundTile({
  className,
  soundId,
  label,
  name,
  image,
  ...props
}: ToneSoundTileProps) {
  const decoration = decorationForSound(soundId);
  const tone = toneNumberForSoundId(soundId);

  return (
    <View
      {...props}
      className={
        tileClass({
          hasAssociation: nullIfEmpty(name) != null,
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
            frameShape="rect"
            className="size-full"
          />
          <View className="absolute inset-0 bg-bg-high/70" />
          <View
            className={`
              absolute inset-0 border border-transparent transition-colors duration-150

              group-hover:border-fg/10
            `}
          />
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
      {tone == null ? (
        <Text
          className="select-none overflow-visible leading-none text-fg/20"
          numberOfLines={1}
        >
          _____
        </Text>
      ) : (
        <ToneLabelText tone={tone} />
      )}
    </View>
  );
}

const tileClass = tv({
  base: `
    group relative w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-bg-high
    p-2 transition-colors duration-150

    hover:bg-fg/5
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

function toneNumberForSoundId(soundId: PinyinSoundId): number | null {
  switch (soundId) {
    case `1`: {
      return 1;
    }
    case `2`: {
      return 2;
    }
    case `3`: {
      return 3;
    }
    case `4`: {
      return 4;
    }
    case `5`: {
      return 5;
    }
    default: {
      return null;
    }
  }
}
