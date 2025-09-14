import { configs, defineConfig, plugins } from "#index.ts";

export default defineConfig(
  { plugins },

  ...configs.recommended,

  {
    files: [`**/*.{js,mjs,ts,tsx}`],
    rules: {
      "@typescript-eslint/no-require-imports": `error`,
    },
  },
);
