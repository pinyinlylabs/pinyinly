import { defineConfig, tseslint } from "@pinyinly/eslint-rules";
import { gitignoreConfig, pluginsConfig } from "./eslint.config.mjs";

// Based on https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/eslint.config.mjs
export default defineConfig(
  gitignoreConfig,
  pluginsConfig,

  {
    files: [`**/*.{cjs,js,mjs,ts,tsx}`],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // Intentionally not use `projectService` because it will cause
        // TypeScript type checking to start which is very slow and we don't
        // need it for codegen.
        projectService: false,
        ecmaVersion: 2022,
        sourceType: `module`,
      },
    },

    linterOptions: {
      // Don't automatically delete /* eslint-disable */ comments (which would
      // happen when they apply to rules that aren't enabled in this config).
      reportUnusedDisableDirectives: `off`,
    },

    settings: {
      react: {
        version: `detect`,
      },
    },
  },

  // TypeScript files
  {
    files: [`**/*.{ts,tsx}`],
    rules: {
      // Generates code based on other files in the file-system, so it's not
      // ESLint `--cache` safe and needs to be part of this codegen config so
      // it's always run. It should still be part of normal linting though for
      // convenience.
      "@pinyinly/glob-template": `error`,

      // Disable ununused rules
      "unicorn/consistent-function-scoping": `off`,
    },
  },
);
