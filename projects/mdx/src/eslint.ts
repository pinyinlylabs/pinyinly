import type { InfiniteDepthConfigWithExtends } from "@pinyinly/eslint-rules";

export const mdxRecommended: InfiniteDepthConfigWithExtends[] = [
  {
    // config with just ignores is the replacement for `.eslintignore`
    ignores: [`**/*.mdx.tsx`],
  },
];
