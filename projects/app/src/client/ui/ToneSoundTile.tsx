import { BaseSoundTile } from "./BaseSoundTile";
import type { PinyinSoundId } from "@/data/model";
import type { PinyinSoundTileProps } from "./BaseSoundTile";

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

export function ToneSoundTile({
  id,
  label,
  name,
  image,
  ...props
}: PinyinSoundTileProps) {
  return (
    <BaseSoundTile
      {...props}
      label={label}
      name={name}
      image={image}
      frameShape="rect"
      size="square"
      decoration={decorationForSound(id)}
    />
  );
}
