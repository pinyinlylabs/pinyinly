import stylisticPlugin from "@stylistic/eslint-plugin";
import type { ESLint } from "eslint";
import type { defineConfig } from "eslint/config";
import { globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export { includeIgnoreFile } from "@eslint/compat";

export type ConfigWithExtendsArray = Parameters<typeof defineConfig>;

const recommended: ConfigWithExtendsArray = [
  globalIgnores([`*-env.d.ts`]),

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

interface Configs {
  recommended: ConfigWithExtendsArray;
}

export const configs: Configs = {
  recommended,
};

export const plugins = {
  [`@stylistic`]: stylisticPlugin as ESLint.Plugin,
  [`@typescript-eslint`]: tseslint.plugin as ESLint.Plugin,
};

export { defineConfig } from "eslint/config";

export { default as tseslint } from "typescript-eslint";
