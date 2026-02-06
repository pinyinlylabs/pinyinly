import { invariant } from "@pinyinly/lib/invariant";
import type { ImageProps } from "expo-image";
import { Image } from "expo-image";
import { tv } from "tailwind-variants";
import type { IconName, IconRegistry } from "./IconRegistry";
import { createIconRegistry } from "./IconRegistry";

export interface IconImageProps extends Pick<ImageProps, `className`> {
  icon: IconName;
  size?: 12 | 16 | 24 | 32;
}

export function IconImage({ icon, className, size }: IconImageProps) {
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
      24: `size-[24px]`,
      32: `size-[32px]`,
    },
  },
  defaultVariants: {
    size: 24,
  },
});

export function classNameLintInvariant(className: string) {
  invariant(
    !/\btext-\w+\/\d+\b/.test(className),
    `transparent text colors are not supported properly by expo-image, use -bgXX colors instead`,
  );
  invariant(
    !/\bsize-/.test(className),
    `use the \`size\` prop instead of passing a size- class`,
  );
}

const iconRegistry: IconRegistry = createIconRegistry();

export const iconNames = Object.keys(iconRegistry) as readonly IconName[];
