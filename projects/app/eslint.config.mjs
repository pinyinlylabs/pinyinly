// @ts-check
import { FlatCompat } from "@eslint/eslintrc";
import inngestPlugin from "@inngest/eslint-plugin";
import stylisticPlugin from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactCompilerPlugin from "eslint-plugin-react-compiler";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

// Based on https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/eslint.config.mjs
export default tseslint.config(
  {
    // note - intentionally uses computed syntax to make it easy to sort the keys
    plugins: {
      [`react-compiler`]: reactCompilerPlugin,
      [`@typescript-eslint`]: tseslint.plugin,
      [`@stylistic`]: stylisticPlugin,
      [`@inngest`]: inngestPlugin,
      // ['@typescript-eslint/internal']: tseslintInternalPlugin,
      // ['eslint-comments']: eslintCommentsPlugin,
      // ['eslint-plugin']: eslintPluginPlugin,
      [`import`]: importPlugin,
      // ['jest']: jestPlugin,
      // ['jsdoc']: jsdocPlugin,
      // ['jsx-a11y']: jsxA11yPlugin,
      [`react-hooks`]: reactHooksPlugin,
      [`react`]: reactPlugin,
      // ['simple-import-sort']: simpleImportSortPlugin,
      // ['unicorn']: unicornPlugin,
    },
  },

  {
    // config with just ignores is the replacement for `.eslintignore`
    ignores: [`.expo/`, `.vercel/`, `dist/`, `drizzle/`, `node_modules/`],
  },

  // All files that should use TypeScript rules.
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // extends ...
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Ban CommonJS globals in ESM files, use import.meta.* instead
  {
    files: [`**/*.{js,mjs,ts,tsx}`],
    rules: {
      "no-restricted-globals": [`error`, `__dirname`, `__filename`],
    },
  },

  {
    extends: [
      ...compat.config(inngestPlugin.configs.recommended),
      ...compat.config(reactPlugin.configs.recommended),
      ...compat.config(reactHooksPlugin.configs.recommended),
    ],
    settings: {
      react: {
        version: `detect`,
      },
    },

    rules: {
      // Expo or react-native or metro or something handles this, so there's no
      // need to import React.
      "react/react-in-jsx-scope": `off`,

      "react/no-children-prop": [`error`, { allowFunctions: true }],

      "react-compiler/react-compiler": `error`,

      //
      // eslint-base
      //

      curly: [`error`, `all`],
      "logical-assignment-operators": `error`,
      "no-else-return": `error`,
      "no-console": `error`,
      "no-process-exit": `error`,
      "no-fallthrough": [
        `error`,
        { commentPattern: `.*intentional fallthrough.*` },
      ],
      "one-var": [`error`, `never`],

      "no-restricted-imports": [
        `error`,
        {
          paths: [
            {
              name: `react-native`,
              importNames: [`SafeAreaView`],
              message: `Please use \`useSafeAreaInsets\` from \`react-native-safe-area-context\` instead.`,
            },
            {
              name: `hanzi`,
              message: `Please use @/dictionary/hanzi instead.`,
            },
            {
              name: `lodash`,
              message: `Please use lodash/* instead.`,
            },

            {
              name: `node:assert`,
              message: `Please use node:assert/strict`,
            },
          ],
        },
      ],
      "no-useless-rename": `error`,
      "object-shorthand": `error`,

      //
      // eslint-plugin-import
      //

      // enforces consistent type specifier style for named imports
      "import/consistent-type-specifier-style": `error`,
      // disallow non-import statements appearing before import statements
      "import/first": `error`,
      // Require a newline after the last import/require in a group
      "import/newline-after-import": `error`,
      // Forbid import of modules using absolute paths
      "import/no-absolute-path": `error`,
      // disallow AMD require/define
      "import/no-amd": `error`,
      // forbid default exports - we want to standardize on named exports so that imported names are consistent
      "import/no-default-export": `error`,
      // disallow imports from duplicate paths
      "import/no-duplicates": `error`,
      // Forbid the use of extraneous packages
      "import/no-extraneous-dependencies": [
        `error`,
        {
          devDependencies: true,
          peerDependencies: true,
          optionalDependencies: false,
        },
      ],
      // Forbid mutable exports
      "import/no-mutable-exports": `error`,
      // Prevent importing the default as if it were named
      "import/no-named-default": `error`,
      // Prohibit named exports
      "import/no-named-export": `off`, // we want everything to be a named export
      // Forbid a module from importing itself
      "import/no-self-import": `error`,
      // Require modules with a single export to use a default export
      "import/prefer-default-export": `off`, // we want everything to be named

      //
      // @typescript-eslint
      //
      "@typescript-eslint/no-var-requires": `off`,
      "@typescript-eslint/restrict-template-expressions": [
        `error`,
        {
          allowAny: false,
          allowArray: false,
          allowBoolean: true,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": [
        `error`,
        { requireDefaultForNonUnion: true },
      ],
      "@typescript-eslint/strict-boolean-expressions": `error`,
      "@typescript-eslint/no-import-type-side-effects": `error`,
      "@typescript-eslint/no-unnecessary-condition": `error`,
      // Expo/metro stuff still uses require().
      "@typescript-eslint/no-require-imports": `off`,
      // A bit buggy when vars are only used as types, sticking with
      // noUnusedLocals and noUnusedParameters.
      "@typescript-eslint/no-unused-vars": `off`,
      // Messes up things where the difference between a type and interface is significant.
      "@typescript-eslint/consistent-type-definitions": `off`,
      // Often only having one usage of a type parameter is fine because it's
      // the only way to use "_ extends _".
      "@typescript-eslint/no-unnecessary-type-parameters": `off`,

      //
      // @stylistic
      //
      "@stylistic/quotes": [`error`, `backtick`],
    },
  },

  // bin scripts
  {
    files: [`bin/**/*`],
    rules: {
      "no-console": `off`,
    },
  },

  // test files
  {
    files: [`**/*.test.*`],
    rules: {
      "@typescript-eslint/no-non-null-assertion": `off`,
      "@typescript-eslint/restrict-template-expressions": `off`,
      "@typescript-eslint/require-await": `off`, // this is annoying when you want a little function to return a promise
    },
  },

  // config files
  {
    files: [`*.config.*`],
    rules: {
      "import/no-default-export": `off`,
    },
  },

  // expo-router pages
  {
    files: [`src/app/**/*`],
    ignores: [
      `**/*+api.*`, // API routes should use named exports
    ],
    rules: {
      "import/no-named-export": `error`, // The only exports should be a default for the page
      "import/no-default-export": `off`,
    },
  },
);
