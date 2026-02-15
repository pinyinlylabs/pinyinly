import { invariant } from "@pinyinly/lib/invariant";
import type { ImageProps } from "expo-image";
import { createIconRegistry } from "./IconRegistry";
import type { IconName, IconRegistry } from "./IconRegistry";

export interface IconImageProps extends Pick<ImageProps, `className`> {
  icon: IconName;
  size?: 12 | 16 | 24 | 32;
}

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

export const iconRegistry: IconRegistry = createIconRegistry();

export const iconNames = Object.keys(iconRegistry) as readonly IconName[];
