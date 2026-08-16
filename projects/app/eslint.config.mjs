import {
  configs,
  defineConfig,
  includeIgnoreFile,
  plugins,
} from "@pinyinly/eslint-rules";
import queryPlugin from "@tanstack/eslint-plugin-query";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";

const gitignorePath = fileURLToPath(new URL(`.gitignore`, import.meta.url));
export const gitignoreConfig = includeIgnoreFile(gitignorePath);

export const pluginsConfig = {
  // note - intentionally uses computed syntax to make it easy to sort the keys
  plugins: {
    ...plugins,
    [`@expoCodeImports`]: plugins[`@typescript-eslint`], // an extra scope for no-restricted-imports so they don't clobber other configs
  },
};

// Based on https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/eslint.config.mjs
export default defineConfig(
  gitignoreConfig,

  pluginsConfig,

  // extends ...
  configs.recommended,

  queryPlugin.configs[`flat/recommended`],

  // Metro bundled files
  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    ignores: [`*.*`, `bin/**/*`, `test/**/*`],
    rules: {
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
