import { FlatCompat } from "@eslint/eslintrc";
import haohaohowPlugin from "@haohaohow/eslint-rules";
import inngestPlugin from "@inngest/eslint-plugin";
import stylisticPlugin from "@stylistic/eslint-plugin";
import drizzlePlugin from "eslint-plugin-drizzle";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactCompilerPlugin from "eslint-plugin-react-compiler";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import unicornPlugin from "eslint-plugin-unicorn";
import { builtinModules } from "node:module";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

// Based on https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/eslint.config.mjs
export default tseslint.config(
  {
    linterOptions: {
      reportUnusedDisableDirectives: `error`,
    },
  },

  {
    // note - intentionally uses computed syntax to make it easy to sort the keys
    plugins: {
      [`@expoCodeImports`]: tseslint.plugin, // an extra scope for no-restricted-imports so they don't clobber other configs
      [`@haohaohow`]: haohaohowPlugin,
      [`@inngest`]: inngestPlugin,
      [`@stylistic`]: stylisticPlugin,
      [`@typescript-eslint`]: tseslint.plugin,
      [`drizzle`]: drizzlePlugin,
      [`import`]: importPlugin,
      [`react-compiler`]: reactCompilerPlugin,
      [`react`]: reactPlugin,
      [`tailwind`]: tailwindPlugin,
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
  ...compat.config(drizzlePlugin.configs.recommended),
  ...compat.config(inngestPlugin.configs.recommended),
  /** @type {Linter.Config} */
  reactHooksPlugin.configs[`recommended-latest`],
  ...compat.config(reactPlugin.configs.recommended),
  unicornPlugin.configs.recommended,

  // Ban CommonJS globals in ESM files, use import.meta.* instead
  {
    files: [`**/*.{js,mjs,ts,tsx}`],
    rules: {
      "no-restricted-globals": [`error`, `__dirname`, `__filename`],
    },
  },

  // Rules for all lintable files.
  {
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
      "no-debugger": `error`,
      "no-else-return": `error`,
      "no-empty-function": `off`, // handled by @typescript-eslint/no-empty-function
      "no-console": [`error`, { allow: [`warn`, `error`] }],
      "no-process-exit": `error`,
      "no-fallthrough": [
        `error`,
        { commentPattern: `.*intentional fallthrough.*` },
      ],
      "one-var": [`error`, `never`],

      "@typescript-eslint/no-restricted-imports": [
        `error`,
        {
          paths: [
            {
              name: `react-native`,
              importNames: [`SafeAreaView`],
              message: `Please use \`useSafeAreaInsets\` from \`react-native-safe-area-context\` instead.`,
            },
            {
              name: `react-native`,
              importNames: [`Animated`],
              message: `Please use the default \`Animated\` import from \`react-native-reanimated\` instead.`,
            },
            {
              name: `react`,
              importNames: [`forwardRef`, `memo`, `useContext`],
              message: `Migrate to React 19 patterns.`,
            },
            {
              name: `hanzi`,
              message: `Please use @/dictionary/hanzi instead.`,
            },
            {
              name: `nanoid`,
              message: `Please use @/util/nanoid instead.`,
            },
            {
              name: `date-fns`,
              message: `Please use date-fns/* instead for smaller bundle size.`,
              allowTypeImports: true,
            },
            {
              name: `lodash`,
              message: `Please use lodash/* instead for smaller bundle size.`,
            },
            {
              name: `node:assert`,
              message: `Please use node:assert/strict`,
            },
            {
              name: `zod`,
              message: `Please use zod/v4 instead`,
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
      "@typescript-eslint/consistent-type-imports": `error`,
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
      // It's broken when using generic inferred return types. Too much noise
      // means it's often turned off even when it perhaps shouldn't be, so it's
      // better to just disable it completely.
      "@typescript-eslint/no-unsafe-return": `off`,
      // It's easier to use the debugger for async code when all promises are
      // awaited so that the function call stack is preserved.
      "@typescript-eslint/return-await": [`error`, `always`],

      //
      // @stylistic
      //
      "@stylistic/quotes": [`error`, `backtick`],

      //
      // drizzle
      //
      "drizzle/enforce-delete-with-where": [
        `error`,
        { drizzleObjectName: [`db`, `tx`] },
      ],

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
      // @haohaohow/eslint-rules
      //
      "@haohaohow/reanimated-default-name": `error`,

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
    files: [`test/**`],
    ignores: [`**/lint.test.ts`],
    rules: {
      "@typescript-eslint/no-non-null-assertion": `off`,
      "@typescript-eslint/restrict-template-expressions": `off`,
      "@typescript-eslint/require-await": `off`, // this is annoying when you want a little function to return a promise
      "@typescript-eslint/return-await": `off`, // this is annoying when you want a little function to return a promise
      "unicorn/consistent-function-scoping": `off`, // it's useful to write functions in the scope of a test
      "unicorn/no-useless-undefined": `off`, // writing undefined can be useful when writing mocks
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
      "import/no-default-export": `off`,
      // Ensuring that default exports are named helps improve the grepability
      // of the codebase by encouraging the re-use of the same identifier for
      // the module's default export at its declaration site and at its import
      // sites.
      "import/no-anonymous-default-export": `error`,
    },
  },

  // TypeScript declaration files
  {
    files: [`**/*.d.ts`],
    rules: {
      // See https://github.com/typescript-eslint/typescript-eslint/issues/7941
      "no-var": `off`,
      // Conflicts when augmenting an interface by adding ` extends …` but
      // leaving the body empty.
      "@typescript-eslint/no-empty-object-type": `off`,
    },
  },

  // Files not run in Node.js environment shouldn't do any Node.js imports. Expo
  // pulls in the `node` types so it doesn't fail type checking on "missing
  // imports", so this lint rule catches them.
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    ignores: [`*.*`, `bin/**/*`, `test/**/*`],
    rules: {
      "@expoCodeImports/no-restricted-imports": [
        `error`,
        {
          paths: [
            ...builtinModules
              .flatMap((x) => (x.startsWith(`node:`) ? [x] : [x, `node:` + x]))
              .map((name) => ({
                name,
                message: `Expo code is universal and doesn't support Node.js packages`,
              })),
            {
              name: `@tanstack/react-query`,
              importNames: [`useQuery`],
              message: `Please use a wrapped version (e.g. useLocalQuery).`,
            },
          ],
          patterns: [
            {
              regex: `^#`,
              message: `Expo code doesn't support subpath imports`,
            },
          ],
        },
      ],
    },
  },
);
