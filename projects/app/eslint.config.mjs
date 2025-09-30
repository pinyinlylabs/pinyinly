import { FlatCompat } from "@eslint/eslintrc";
import inngestPlugin from "@inngest/eslint-plugin";
import {
  configs,
  defineConfig,
  includeIgnoreFile,
  plugins,
} from "@pinyinly/eslint-rules";
import queryPlugin from "@tanstack/eslint-plugin-query";
import drizzlePlugin from "eslint-plugin-drizzle";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const gitignorePath = fileURLToPath(new URL(`.gitignore`, import.meta.url));
export const gitignoreConfig = includeIgnoreFile(gitignorePath);

export const pluginsConfig = {
  // note - intentionally uses computed syntax to make it easy to sort the keys
  plugins: {
    ...plugins,
    [`@expoCodeImports`]: plugins[`@typescript-eslint`], // an extra scope for no-restricted-imports so they don't clobber other configs
    [`@inngest`]: inngestPlugin,
    [`drizzle`]: drizzlePlugin,
  },
};

// Based on https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/eslint.config.mjs
export default defineConfig(
  gitignoreConfig,

  pluginsConfig,

  // extends ...
  configs.recommended,
  configs.esm,
  configs.react,
  configs.tailwind,

  queryPlugin.configs[`flat/recommended`],
  compat.config(drizzlePlugin.configs.recommended),
  compat.config(inngestPlugin.configs.recommended),

  // TypeScript files
  {
    files: [`**/*.{ts,tsx}`],
    rules: {
      // Expo or react-native or metro or something handles this, so there's no
      // need to import React.
      "react/react-in-jsx-scope": `off`,

      //
      // drizzle
      //

      "drizzle/enforce-delete-with-where": [
        `error`,
        { drizzleObjectName: [`db`, `tx`] },
      ],
    },
  },

  // expo-router pages
  {
    files: [`src/app/**/*.{ts,tsx}`],
    ignores: [
      `**/*+api.*`, // API routes should use named exports
    ],
    rules: {
      "import-x/no-default-export": `off`,
      // Ensuring that default exports are named helps improve the grepability
      // of the codebase by encouraging the re-use of the same identifier for
      // the module's default export at its declaration site and at its import
      // sites.
      "import-x/no-anonymous-default-export": `error`,
    },
  },

  // dev files
  {
    files: [`src/app/dev/**/*.{ts,tsx}`],
    rules: {
      "no-console": `off`,
    },
  },

  // Demo UI files
  {
    files: [`src/**/*.demo.tsx`],
    rules: {
      "import-x/no-anonymous-default-export": `off`,
      "import-x/no-default-export": `off`,
      "import-x/no-named-default": `off`,
      "no-console": `off`,
      "react/display-name": `off`, // the display name is the filename
      "unicorn/no-anonymous-default-export": `off`,
    },
  },

  // Metro bundled files
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    ignores: [`*.*`, `bin/**/*`, `test/**/*`],
    rules: {
      // Expo code doesn't support subpath imports, so rewrite them to use the
      // @/ path alias.
      "@pinyinly/import-path-rewrite": [
        `error`,
        {
          patterns: [{ from: String.raw`^#(.+)\.[jt]sx?$`, to: `@/$1` }],
        },
      ],
      // Files not run in Node.js environment shouldn't do any Node.js imports. Expo
      // pulls in the `node` types so it doesn't fail type checking on "missing
      // imports", so this lint rule catches them.
      "@expoCodeImports/no-restricted-imports": [
        `error`,
        {
          paths: builtinModules
            .flatMap((x) => (x.startsWith(`node:`) ? [x] : [x, `node:` + x]))
            .map((name) => ({
              name,
              message: `Expo code is universal and doesn't support Node.js packages`,
            })),
        },
      ],
    },
  },
);
