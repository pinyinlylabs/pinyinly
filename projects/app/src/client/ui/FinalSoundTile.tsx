import { BaseSoundTile } from "./BaseSoundTile";
import type { PinyinSoundTileProps } from "./BaseSoundTile";

export function FinalSoundTile({
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
      size="rect"
    />
  );
}
