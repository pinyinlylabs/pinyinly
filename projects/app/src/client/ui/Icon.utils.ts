import { invariant } from "@pinyinly/lib/invariant";

export function classNameLintInvariant(className: string) {
  invariant(
    !/\btext-/u.test(className),
    `text-* classes are not allowed, use tintColorClassName with accent-* instead.`,
  );
  invariant(
    !/\bsize-/u.test(className),
    `use the \`size\` prop instead of passing a size- class`,
  );
}

export function tintColorClassNameInvariant(className: string) {
  invariant(
    !/\baccent-\w+\/\d+\b/u.test(className),
    `transparent accent colors are not supported properly by expo-image, use -bgXX colors instead`,
  );

  invariant(
    /^(?:accent-\S+)(?:\s+accent-\S+)*$/u.test(className),
    `only an accent-* class is allowed, not "%s"`,
    className,
  );
}
