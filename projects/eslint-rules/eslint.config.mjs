import { config, configs, plugins } from "#index.ts";

export default config(
  { plugins },

  ...configs.recommended,

  {
    files: [`**/*.{js,mjs,ts,tsx}`],
    rules: {
      "@typescript-eslint/no-require-imports": `error`,
    },
  },
);
