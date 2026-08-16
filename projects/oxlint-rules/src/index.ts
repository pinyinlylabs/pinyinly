import { eslintCompatPlugin } from "@oxlint/plugins";
import { globTemplate as globTemplateRule } from "./glob-template.ts";
import { importNames as importNamesRule } from "./import-names.ts";
import { importPathRewrite as importPathRewriteRule } from "./import-path-rewrite.ts";
import { noRestrictedCssClasses as noRestrictedCssClassesRule } from "./no-restricted-css-classes.ts";

// oxlint jsPlugins resolution requires a default export.
// oxlint-disable-next-line import/no-default-export
export default eslintCompatPlugin({
  meta: {
    name: `pinyinly`,
  },
  rules: {
    [`import-names`]: importNamesRule,
    [`import-path-rewrite`]: importPathRewriteRule,
    [`no-restricted-css-classes`]: noRestrictedCssClassesRule,
    [`glob-template`]: globTemplateRule,
  },
});
