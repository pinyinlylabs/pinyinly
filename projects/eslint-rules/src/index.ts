import stylisticPlugin from "@stylistic/eslint-plugin";
import type { ESLint } from "eslint";
import betterTailwindcssPlugin from "eslint-plugin-better-tailwindcss";
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults";
import type { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import { globTemplate as globTemplateRule } from "./glob-template.ts";
import { importNames as importNamesRule } from "./import-names.ts";
import { importPathRewrite as importPathRewriteRule } from "./import-path-rewrite.ts";
import { nameof as nameofRule } from "./nameof.ts";
import { noRestrictedCssClasses as noRestrictedCssClassesRule } from "./no-restricted-css-classes.ts";

export { includeIgnoreFile } from "@eslint/compat";

export const plugin: ESLint.Plugin = {
  rules: {
    [`import-names`]: importNamesRule,
    [`import-path-rewrite`]: importPathRewriteRule,
    [`nameof`]: nameofRule,
    [`no-restricted-css-classes`]: noRestrictedCssClassesRule,
    [`glob-template`]: globTemplateRule,
  },
};

// oxlint-disable-next-line import/no-default-export
export default plugin;

export type ConfigWithExtendsArray = Parameters<typeof defineConfig>;

const recommended: ConfigWithExtendsArray = [
  // All files that should use TypeScript rules.
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    linterOptions: {
      reportUnusedDisableDirectives: `error`,
    },
  },

  tseslint.configs.base,

  // Global
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],

    rules: {
      //
      // @stylistic
      //

      "@stylistic/quotes": [`error`, `backtick`],
    },
  },
];

const tailwind: ConfigWithExtendsArray = [
  {
    files: [`**/*.{ts,tsx}`],

    rules: {
      //
      // better-tailwindcss
      //

      "better-tailwindcss/enforce-consistent-class-order": `error`,
      "better-tailwindcss/enforce-consistent-line-wrapping": [
        `error`,
        {
          printWidth: 100,
          group: `emptyLine`,
        },
      ],
      "better-tailwindcss/enforce-consistent-important-position": `error`,
      "better-tailwindcss/enforce-shorthand-classes": `error`,
      "better-tailwindcss/no-conflicting-classes": `error`,
      "better-tailwindcss/no-unknown-classes": [
        `error`,
        { detectComponentClasses: true },
      ],
      "better-tailwindcss/no-unnecessary-whitespace": `error`,
    },

    settings: {
      "better-tailwindcss": {
        // Resolve Tailwind assets from each package root.
        cwd: `.`,
        // Tailwind v4 CSS-first entrypoint.
        entryPoint: `./src/global.css`,
        selectors: [
          ...getDefaultSelectors(),
          {
            kind: `attribute`,
            // Support React Native Web attributes e.g. contentContainerClassName.
            name: `.*ClassName`,
          },
        ],
      },
    },
  },
];

interface Configs {
  recommended: ConfigWithExtendsArray;
  tailwind: ConfigWithExtendsArray;
}

export const configs: Configs = {
  recommended,
  tailwind,
};

export const plugins = {
  [`@pinyinly`]: plugin,
  [`@stylistic`]: stylisticPlugin as ESLint.Plugin,
  [`@typescript-eslint`]: tseslint.plugin as ESLint.Plugin,
  [`better-tailwindcss`]: betterTailwindcssPlugin as ESLint.Plugin,
};

export { defineConfig } from "eslint/config";

export { default as tseslint } from "typescript-eslint";
