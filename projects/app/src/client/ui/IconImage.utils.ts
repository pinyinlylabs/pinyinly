import { invariant } from "@pinyinly/lib/invariant";
import type { IconName, IconRegistry } from "./IconRegistry";
import { createIconRegistry } from "./IconRegistry";

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
