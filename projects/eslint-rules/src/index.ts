import stylisticPlugin from "@stylistic/eslint-plugin";
import type { ESLint } from "eslint";
import betterTailwindcssPlugin from "eslint-plugin-better-tailwindcss";
import { getDefaultAttributes } from "eslint-plugin-better-tailwindcss/api/defaults";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import unicorn from "eslint-plugin-unicorn";
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

export type ConfigWithExtendsArray = Parameters<typeof defineConfig>;

const recommended: ConfigWithExtendsArray = [
  // All files that should use TypeScript rules.
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    linterOptions: {
      reportUnusedDisableDirectives: `error`,
    },
    settings: {
      react: {
        version: `detect`,
      },
    },
  },

  tseslint.configs.base,

  // Global
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],

    rules: {
      //
      // eslint-base
      //

      "logical-assignment-operators": `error`,
      "no-process-exit": `error`,
      "one-var": [`error`, `never`],

      //
      // @pinyinly
      //

      "@pinyinly/import-names": [
        `error`,
        {
          defaultImports: {
            "node:path": `path`,
            "react-native-reanimated": `Reanimated`,
          },
          namedImports: {
            "posthog-react-native": {
              PostHogProvider: `RnPostHogProvider`,
              usePostHog: `rnUsePostHog`,
            },
            "posthog-js/react": {
              PostHogProvider: `WebPostHogProvider`,
              usePostHog: `webUsePostHog`,
            },
            react: {
              Suspense: `ReactSuspense`,
            },
            "react-native": {
              Animated: `RnAnimated`,
              Easing: `RnEasing`,
              Image: `RnImage`,
            },
          },
        },
      ],
      "@pinyinly/nameof": `error`,
      "@pinyinly/glob-template": `error`,

      //
      // eslint-plugin-import
      //

      // Forbid the use of extraneous packages
      "import/no-extraneous-dependencies": [
        `error`,
        {
          devDependencies: true,
          peerDependencies: true,
          optionalDependencies: false,
        },
      ],
      // Prevent importing the default as if it were named
      "import/no-named-default": `error`,
      // Prohibit named exports
      "import/no-named-export": `off`, // we want everything to be a named export
      // Require modules with a single export to use a default export
      "import/prefer-default-export": `off`, // we want everything to be named

      //
      // @stylistic
      //

      "@stylistic/quotes": [`error`, `backtick`],
    },
  },
];

const react: ConfigWithExtendsArray = [
  {
    files: [`**/*.{ts,tsx}`],
    rules: reactPlugin.configs.recommended.rules,
  },

  {
    files: [`**/*.{ts,tsx}`],
    rules: {
      //
      // react
      //

      "react/prop-types": `off`, // we use TypeScript for type checking
      "react/no-children-prop": [`error`, { allowFunctions: true }],

      "@pinyinly/no-restricted-css-classes": [
        `error`,
        {
          classes: [
            { name: `flex-col`, message: `flex-col is already the default` },
          ],
        },
      ],
    },
  },
];

const tailwind: ConfigWithExtendsArray = [
  {
    files: [`**/*.{ts,tsx}`],

    rules: {
      //
      // tailwindcss
      //

      "tailwind/classnames-order": `error`,
      "tailwind/enforces-negative-arbitrary-values": `error`,
      "tailwind/enforces-shorthand": `error`,
      "tailwind/migration-from-tailwind-2": `error`,
      "tailwind/no-contradicting-classname": `error`,
      "tailwind/no-custom-classname": `error`,
      "tailwind/no-unnecessary-arbitrary-value": `error`,

      //
      // better-tailwindcss
      //

      "better-tailwindcss/multiline": [
        `error`,
        {
          printWidth: 100,
          group: `emptyLine`,
        },
      ],
      "better-tailwindcss/no-unnecessary-whitespace": `error`,
    },

    settings: {
      "better-tailwindcss": {
        // Tailwind 3 config
        tailwindConfig: `tailwind.config.js`,
        attributes: [
          ...getDefaultAttributes(),
          // support <ScrollView> attributes e.g. contentContainerClassName
          `.*ClassName`,
        ],
      },
    },
  },
];

interface Configs {
  react: ConfigWithExtendsArray;
  recommended: ConfigWithExtendsArray;
  tailwind: ConfigWithExtendsArray;
}

export const configs: Configs = {
  react,
  recommended,
  tailwind,
};

export const plugins = {
  [`@pinyinly`]: plugin,
  [`@stylistic`]: stylisticPlugin as ESLint.Plugin,
  [`@typescript-eslint`]: tseslint.plugin as ESLint.Plugin,
  [`better-tailwindcss`]: betterTailwindcssPlugin as ESLint.Plugin,
  [`import`]: importPlugin as ESLint.Plugin,
  [`react`]: reactPlugin as ESLint.Plugin,
  [`tailwind`]: tailwindPlugin as ESLint.Plugin,
  [`unicorn`]: unicorn,
};

export { defineConfig } from "eslint/config";

export { default as tseslint } from "typescript-eslint";
