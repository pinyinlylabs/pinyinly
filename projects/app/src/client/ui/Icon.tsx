import type { ImageProps } from "expo-image";
import { Image } from "expo-image";
import { tv } from "tailwind-variants";
import { classNameLintInvariant } from "./Icon.utils";
import type { IconName } from "./iconRegistry";
import { iconRegistry } from "./iconRegistry";

export interface IconProps extends Pick<ImageProps, `className`> {
  icon: IconName;
  size?: 12 | 16 | 20 | 24 | 32;
}

export function Icon({ icon, className, size }: IconProps) {
  if (__DEV__ && className != null) {
    classNameLintInvariant(className);
  }

  return (
    <Image
      className={imageClass({ className, size })}
      source={iconRegistry[icon]}
      tintColor={
        // Use the current text color as the tint.
        `currentColor`
      }
    />
  );
}

const imageClass = tv({
  // It's a UI element and not part of the content, so:
  // - `pointer-events-none` to prevent the image from being click and dragged
  // - `select-none` to not highlight with a box when it's surrounded in a text
  //   selection.
  base: `pointer-events-none shrink select-none text-fg`,
  variants: {
    size: {
      12: `size-[12px]`,
      16: `size-[16px]`,
      20: `size-[20px]`,
      24: `size-[24px]`,
      32: `size-[32px]`,
    },
  },
  defaultVariants: {
    size: 24,
  },
});
