import type { ConfigWithExtendsArray } from "@pinyinly/eslint-rules";

export const mdxRecommended: ConfigWithExtendsArray = [
  {
    // config with just ignores is the replacement for `.eslintignore`
    ignores: [`**/*.mdx.tsx`],
  },
];
