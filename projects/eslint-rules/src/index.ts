import stylisticPlugin from "@stylistic/eslint-plugin";
import type { ESLint } from "eslint";
import betterTailwindcssPlugin from "eslint-plugin-better-tailwindcss";
import { getDefaultAttributes } from "eslint-plugin-better-tailwindcss/api/defaults";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactCompilerPlugin from "eslint-plugin-react-compiler";
import reactHooksPlugin from "eslint-plugin-react-hooks";
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

// Strip out the plugin to avoid double declaring it.
const { plugins: _, ...unicornRecommendedConfig } = unicorn.configs.recommended;

const recommended: ConfigWithExtendsArray = [
  // All files that should use TypeScript rules.
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: `error`,
    },
    settings: {
      react: {
        version: `detect`,
      },
    },
  },

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  unicornRecommendedConfig,

  // Global
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],

    rules: {
      //
      // eslint-base
      //

      // NOTE: The following rules are handled by Oxlint for better performance
      curly: `off`, // handled by oxlint
      "no-console": `off`, // handled by oxlint
      "no-debugger": `off`, // handled by oxlint
      "no-else-return": `off`, // handled by oxlint
      "no-useless-rename": `off`, // handled by oxlint

      "logical-assignment-operators": `error`,
      "no-fallthrough": [
        `error`,
        { commentPattern: `.*intentional fallthrough.*` },
      ],
      "no-process-exit": `error`,
      "object-shorthand": `error`,
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

      // enforces consistent type specifier style for named imports
      "import/consistent-type-specifier-style": `error`,
      // Require a newline after the last import/require in a group
      "import/newline-after-import": `error`,
      // Forbid import of modules using absolute paths
      "import/no-absolute-path": `error`,
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

      //
      // unicorn
      //

      "unicorn/no-null": `off`, // null used extensively
      "unicorn/number-literal-case": `off`, // overwritten by prettier
      "unicorn/numeric-separators-style": [
        `error`,
        {
          onlyIfContainsSeparator: true,
          number: { onlyIfContainsSeparator: false },
        },
      ],
      "unicorn/prefer-module": `off`, // still need to use require(…) with metro
      "unicorn/prevent-abbreviations": `off`, // abbreviations are fine
      "unicorn/no-nested-ternary": `off`, // nested ternaries are not so bad
      "unicorn/filename-case": `off`, // using camelCase for filenames

      //
      // @typescript-eslint
      //

      "@typescript-eslint/no-explicit-any": `off`,
      // Messes up things where the difference between a type and interface is significant.
      "@typescript-eslint/consistent-type-definitions": `off`,
      "@typescript-eslint/no-var-requires": `off`,
      "@typescript-eslint/no-restricted-imports": `off`,
      "@typescript-eslint/no-unnecessary-condition": `off`,
      "@typescript-eslint/no-unsafe-assignment": `off`,
      "@typescript-eslint/no-unsafe-member-access": `off`,
      "@typescript-eslint/no-unsafe-argument": `off`,
      // Expo/metro stuff still uses require().
      "@typescript-eslint/no-require-imports": `off`,
      // A bit buggy when vars are only used as types, sticking with
      // noUnusedLocals and noUnusedParameters.
      "@typescript-eslint/no-unused-vars": `off`,
      "@typescript-eslint/no-unnecessary-type-constraint": `off`,
      "@typescript-eslint/no-unnecessary-type-parameters": `off`,
      // It's broken when using generic inferred return types. Too much noise
      // means it's often turned off even when it perhaps shouldn't be, so it's
      // better to just disable it completely.
      "@typescript-eslint/no-unsafe-return": `off`,
      "@typescript-eslint/no-unsafe-call": `off`,
      // Migrated to oxlint - see typescript/restrict-template-expressions in oxlint config
      "@typescript-eslint/restrict-template-expressions": `off`,
      "@typescript-eslint/switch-exhaustiveness-check": `off`,
      "@typescript-eslint/strict-boolean-expressions": `off`,
      // It's easier to use the debugger for async code when all promises are
      // awaited so that the function call stack is preserved.
      "@typescript-eslint/return-await": `off`,
      "@typescript-eslint/require-await": `off`,
      "@typescript-eslint/no-empty-object-type": `off`,
    },
  },

  // config files
  {
    files: [`*.config.*`],
    rules: {},
  },

  // bin scripts
  {
    files: [`bin/**/*.{ts,tsx}`],
    rules: {
      "no-console": `off`,
    },
  },

  // test files
  {
    files: [`test/**/*.{ts,tsx}`],
    ignores: [`**/lint.test-d.ts`],
    rules: {
      "@typescript-eslint/no-non-null-assertion": `off`,
      "@typescript-eslint/no-unsafe-assignment": `off`,
      "@typescript-eslint/require-await": `off`, // this is annoying when you want a little function to return a promise
      "@typescript-eslint/return-await": `off`, // this is annoying when you want a little function to return a promise
      // It's useful to use inline type annotations for mocking.
      "unicorn/consistent-function-scoping": `off`, // it's useful to write functions in the scope of a test
      "unicorn/no-useless-undefined": `off`, // writing undefined can be useful when writing mocks
    },
  },

  // TypeScript declaration files
  {
    files: [`**/*.d.ts`],
    rules: {
      // See https://github.com/typescript-eslint/typescript-eslint/issues/7941
      "no-var": `off`,
      // `any` is useful in declaration files, so allow it.
      "@typescript-eslint/no-explicit-any": `off`,
      // Conflicts when augmenting an interface by adding ` extends …` but
      // leaving the body empty.
      "@typescript-eslint/no-empty-object-type": `off`,
      // Interface merging works with interface declarations, not `Record<…>`.
      "@typescript-eslint/consistent-indexed-object-style": `off`,
      // When defining modules in a declaration file, some will make default
      // exports.
      // Allow `export {}` to turn .d.ts files into modules, and make `declare
      // global { … }` work as intended.
      "unicorn/require-module-specifiers": `off`,
    },
  },
];

const esm: ConfigWithExtendsArray = [
  // Ban CommonJS globals in ESM files, use import.meta.* instead
  {
    files: [`**/*.{js,mjs,ts,tsx}`],
    rules: {
      "no-restricted-globals": [`error`, `__dirname`, `__filename`],
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

      //
      // react-compiler
      //

      "react-compiler/react-compiler": `error`,

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

  {
    // Strip out `plugins` to avoid declaring it.
    files: [`**/*.{ts,tsx}`],
    name: reactHooksPlugin.configs[`recommended-latest`].name,
    rules: reactHooksPlugin.configs[`recommended-latest`].rules,
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
  esm: ConfigWithExtendsArray;
  react: ConfigWithExtendsArray;
  recommended: ConfigWithExtendsArray;
  tailwind: ConfigWithExtendsArray;
}

export const configs: Configs = {
  esm,
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
  [`react-compiler`]: reactCompilerPlugin as ESLint.Plugin,
  [`react-hooks`]: reactHooksPlugin as ESLint.Plugin,
  [`react`]: reactPlugin as ESLint.Plugin,
  [`tailwind`]: tailwindPlugin as ESLint.Plugin,
  [`unicorn`]: unicorn,
};

export { defineConfig } from "eslint/config";

export { default as tseslint } from "typescript-eslint";
