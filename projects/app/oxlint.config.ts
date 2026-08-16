import { defineConfig } from "oxlint";
import { baseConfig } from "@pinyinly/oxlint-rules";
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults";

export default defineConfig({
  $schema: `../../node_modules/oxlint/configuration_schema.json`,
  extends: [baseConfig],
  jsPlugins: [
    {
      name: `pinyinly`,
      specifier: `@pinyinly/oxlint-rules`,
    },
    {
      name: `better-tailwindcss`,
      specifier: `eslint-plugin-better-tailwindcss`,
    },
  ],
  rules: {
    // "pinyinly/no-restricted-css-classes": [
    //   "error",
    //   {
    //     "classes": [
    //       { "name": "flex-col", "message": "flex-col is already the default" }
    //     ]
    //   }
    // ]
  },
  settings: {
    "better-tailwindcss": {
      cwd: import.meta.dirname,
      entryPoint: `./src/global.css`,
      selectors: [
        ...(getDefaultSelectors() as {
          kind: string;
          name: string;
        }[]),
        {
          kind: `attribute`,
          name: `.*ClassName`,
        },
      ],
    },
  },
  overrides: [
    {
      files: [`src/**/*.ts`, `src/**/*.tsx`],
      rules: {
        "better-tailwindcss/enforce-consistent-class-order": `error`,
        "better-tailwindcss/enforce-consistent-line-wrapping": [
          `error`,
          { printWidth: 100, group: `emptyLine` },
        ],
        "better-tailwindcss/enforce-consistent-important-position": `error`,
        "better-tailwindcss/enforce-shorthand-classes": `error`,
        "better-tailwindcss/no-conflicting-classes": `error`,
        "better-tailwindcss/no-unknown-classes": [
          `error`,
          { detectComponentClasses: true },
        ],
        "better-tailwindcss/no-unnecessary-whitespace": `error`,
      },
    },
    // Expo bundled files. Metro doesn't support subpath imports, so rewrite
    // them to use the @/ path alias.
    {
      files: [
        `src/**/*.cjs`,
        `src/**/*.js`,
        `src/**/*.mjs`,
        `src/**/*.ts`,
        `src/**/*.tsx`,
      ],
      rules: {
        "pinyinly/import-path-rewrite": [
          `error`,
          {
            patterns: [{ from: `^#(.+)\\.[jt]sx?$`, to: `@/$1` }],
          },
        ],
      },
    },
    // expo-router pages
    {
      files: [`src/app/**/*.ts`, `src/app/**/*.tsx`],
      rules: {
        // expo-router pages use a default export for the page
        "import/no-default-export": `off`,
        // Ensuring that default exports are named helps improve the grepability
        // of the codebase by encouraging the re-use of the same identifier for
        // the module's default export at its declaration site and at its import
        // sites.
        "import-js/no-anonymous-default-export": `error`,
      },
    },
    {
      files: [`src/app/**/*+api.ts`, `src/app/**/*+api.tsx`],
      rules: {
        "import/no-default-export": `deny`,
      },
    },
    // Demo UI files
    {
      files: [`src/**/*.demo.tsx`],
      rules: {
        "eslint/no-empty-function": `off`,
        "import-js/no-anonymous-default-export": `off`,
        "import-js/no-named-default": `off`,
        "import/no-default-export": `off`,
        "no-console": `off`,
        "react/display-name": `off`, // the display name is the filename
        "react/only-export-components": `off`,
        "unicorn/no-anonymous-default-export": `off`,
      },
    },
    {
      files: [`src/server/lib/inngest/**`],
      rules: {
        // Inngest handlers receive a logger in function context. Use that logger
        // for structured object-first logging instead of console.* calls.
        "no-console": `deny`,
      },
    },
  ],
  env: {
    builtin: true,
  },
  ignorePatterns: [`**/*.d.ts`, `src/app/dev/**`],
});
