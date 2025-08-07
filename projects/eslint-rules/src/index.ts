import stylisticPlugin from "@stylistic/eslint-plugin";
import type { ESLint } from "eslint";
import betterTailwindcssPlugin from "eslint-plugin-better-tailwindcss";
import { getDefaultAttributes } from "eslint-plugin-better-tailwindcss/api/defaults";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactCompilerPlugin from "eslint-plugin-react-compiler";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import unicornPlugin from "eslint-plugin-unicorn";
import type { InfiniteDepthConfigWithExtends } from "typescript-eslint";
import tseslint from "typescript-eslint";
import { globTemplate as globTemplateRule } from "./glob-template.js";
import { importNames as importNamesRule } from "./import-names.js";
import { importPathRewrite as importPathRewriteRule } from "./import-path-rewrite.js";
import { nameof as nameofRule } from "./nameof.js";
import { noRestrictedCssClasses as noRestrictedCssClassesRule } from "./no-restricted-css-classes.js";

export const config = tseslint.config;

export const plugin: ESLint.Plugin = {
  rules: {
    [`import-names`]: importNamesRule,
    [`import-path-rewrite`]: importPathRewriteRule,
    [`nameof`]: nameofRule,
    [`no-restricted-css-classes`]: noRestrictedCssClassesRule,
    [`glob-template`]: globTemplateRule,
  },
};

const recommended: InfiniteDepthConfigWithExtends[] = [
  {
    linterOptions: {
      reportUnusedDisableDirectives: `error`,
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

    settings: {
      react: {
        version: `detect`,
      },
    },
  },

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  unicornPlugin.configs.recommended,

  // Global
  {
    rules: {
      //
      // eslint-base
      //

      curly: [`error`, `all`],
      "logical-assignment-operators": `error`,
      "no-console": [`error`, { allow: [`warn`, `error`] }],
      "no-debugger": `error`,
      "no-else-return": `error`,
      "no-empty-function": `off`, // handled by @typescript-eslint/no-empty-function
      "no-fallthrough": [
        `error`,
        { commentPattern: `.*intentional fallthrough.*` },
      ],
      "no-process-exit": `error`,
      "no-useless-rename": `error`,
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
            "react-native": {
              Animated: `RnAnimated`,
              Easing: `RnEasing`,
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

      // Messes up things where the difference between a type and interface is significant.
      "@typescript-eslint/consistent-type-definitions": `off`,
      "@typescript-eslint/consistent-type-imports": `error`,
      "@typescript-eslint/no-var-requires": `off`,
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
              name: `react`,
              importNames: [`forwardRef`, `memo`, `useContext`],
              message: `Migrate to React 19 patterns.`,
            },
            {
              name: `vitest`,
              importNames: [`it`],
              message: `Use \`test(…)\` instead of \`it(…)\` for consistency.`,
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
              message: `Please use vitest instead.`,
            },
            {
              name: `node:assert/strict`,
              message: `Please use vitest instead.`,
            },
            {
              name: `node:test`,
              message: `Please use vitest instead.`,
            },
            {
              name: `zod`,
              message: `Please use zod/v4 instead.`,
            },
            {
              name: `glob`,
              message: `Please use glob from @pinyinly/lib/fs instead.`,
            },
            {
              name: `node:fs/promises`,
              message: `Please use @pinyinly/lib/fs instead.`,
            },
            {
              name: `node:fs`,
              message: `Please use @pinyinly/lib/fs instead.`,
            },
            {
              name: `@bacons/mdx`,
              message: `Please use @/client/mdx instead.`,
            },
          ],
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": `error`,
      "@typescript-eslint/no-unnecessary-condition": `error`,
      // Expo/metro stuff still uses require().
      "@typescript-eslint/no-require-imports": `off`,
      // A bit buggy when vars are only used as types, sticking with
      // noUnusedLocals and noUnusedParameters.
      "@typescript-eslint/no-unused-vars": `off`,

      "@typescript-eslint/no-unnecessary-type-assertion": `error`,
      "@typescript-eslint/no-unnecessary-type-constraint": `error`,
      // Often only having one usage of a type parameter is fine because it's
      // the only way to use "_ extends _".
      "@typescript-eslint/no-unnecessary-type-parameters": `off`,
      // It's broken when using generic inferred return types. Too much noise
      // means it's often turned off even when it perhaps shouldn't be, so it's
      // better to just disable it completely.
      "@typescript-eslint/no-unsafe-return": `off`,
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
      // It's easier to use the debugger for async code when all promises are
      // awaited so that the function call stack is preserved.
      "@typescript-eslint/return-await": [`error`, `always`],
    },
  },

  // config files
  {
    files: [`*.config.*`],
    rules: {
      "import/no-default-export": `off`,
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
    ignores: [`**/lint.test-d.ts`],
    rules: {
      "@typescript-eslint/no-non-null-assertion": `off`,
      "@typescript-eslint/restrict-template-expressions": `off`,
      "@typescript-eslint/require-await": `off`, // this is annoying when you want a little function to return a promise
      "@typescript-eslint/return-await": `off`, // this is annoying when you want a little function to return a promise
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
      "import/no-default-export": `off`,
    },
  },
];

const esm: InfiniteDepthConfigWithExtends[] = [
  // Ban CommonJS globals in ESM files, use import.meta.* instead
  {
    files: [`**/*.{js,mjs,ts,tsx}`],
    rules: {
      "no-restricted-globals": [`error`, `__dirname`, `__filename`],
    },
  },
];

const react: InfiniteDepthConfigWithExtends[] = [
  {
    rules: reactPlugin.configs.recommended.rules,
  },

  {
    files: [`**/*.{js,mjs,ts,tsx}`],

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
    name: reactHooksPlugin.configs[`recommended-latest`].name,
    rules: reactHooksPlugin.configs[`recommended-latest`].rules,
  },
];

const tailwind: InfiniteDepthConfigWithExtends[] = [
  {
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

export const configs = {
  esm,
  react,
  recommended,
  tailwind,
};

export const plugins = {
  [`@pinyinly`]: plugin,
  [`@stylistic`]: stylisticPlugin,
  [`@typescript-eslint`]: tseslint.plugin,
  [`better-tailwindcss`]: betterTailwindcssPlugin,
  [`import`]: importPlugin,
  [`react-compiler`]: reactCompilerPlugin,
  [`react-hooks`]: reactHooksPlugin,
  [`react`]: reactPlugin,
  [`tailwind`]: tailwindPlugin,
};
