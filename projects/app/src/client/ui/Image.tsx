import type { PropsOf } from "@pinyinly/lib/types";
// oxlint-disable-next-line no-restricted-imports -- This is a wrapper for Uniwind support, so we need to import from expo-image here.
import { Image as BaseImage } from "expo-image";
import { withUniwind } from "uniwind";

const Image = Object.assign(
  withUniwind(BaseImage, {
    tintColor: {
      fromClassName: `tintColorClassName`,
      styleProperty: `accentColor`,
    },
  }),
  {
    prefetch: async (...args: Parameters<typeof BaseImage.prefetch>) =>
      BaseImage.prefetch(...args),
  },
);

export { Image };
export type ImageProps = PropsOf<typeof Image>;

export type { ImageStyle } from "expo-image";
