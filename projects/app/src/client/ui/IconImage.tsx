import { invariant } from "@pinyinly/lib/invariant";
import type { ImageProps } from "expo-image";
import { Image } from "expo-image";
import { tv } from "tailwind-variants";

export interface IconImageProps
  extends Pick<ImageProps, `source` | `className`> {
  size?: 12 | 24 | 32;
}

export function IconImage({ source, className, size }: IconImageProps) {
  if (__DEV__ && className != null) {
    classNameLintInvariant(className);
  }

  return (
    <Image
      className={imageClass({ className, size })}
      source={source}
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
