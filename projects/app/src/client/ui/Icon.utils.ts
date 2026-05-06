import { invariant } from "@pinyinly/lib/invariant";

export function classNameLintInvariant(className: string) {
  invariant(
    !/\btext-\w+\/\d+\b/u.test(className),
    `transparent text colors are not supported properly by expo-image, use -bgXX colors instead`,
  );
  invariant(
    !/\bsize-/u.test(className),
    `use the \`size\` prop instead of passing a size- class`,
  );
}
