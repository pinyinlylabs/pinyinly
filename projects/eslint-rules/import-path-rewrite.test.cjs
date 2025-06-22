const { RuleTester } = require("eslint");
const rule = require("./import-path-rewrite.cjs");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("import-path-rewrite", rule, {
  valid: [
    // Paths that don't match any pattern remain unchanged
    {
      code: "import foo from 'foo';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
    },
    {
      code: "import bar from '@/bar';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
    },
    {
      code: "import { baz } from '@/utils/baz';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
    },
  ],

  invalid: [
    // Basic rewrite: #util/foo.ts -> @/util/foo
    {
      code: "import foo from '#util/foo.ts';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
      errors: [
        {
          message:
            'Import path "#util/foo.ts" should be rewritten to "@/util/foo"',
        },
      ],
      output: "import foo from '@/util/foo';",
    },

    // Also with named imports
    {
      code: "import { bar } from '#components/bar.ts';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
      errors: [
        {
          message:
            'Import path "#components/bar.ts" should be rewritten to "@/components/bar"',
        },
      ],
      output: "import { bar } from '@/components/bar';",
    },

    // With export declarations
    {
      code: "export * from '#models/index.ts';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
      errors: [
        {
          message:
            'Import path "#models/index.ts" should be rewritten to "@/models/index"',
        },
      ],
      output: "export * from '@/models/index';",
    },

    // With named exports
    {
      code: "export { default } from '#constants/values.ts';",
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
      errors: [
        {
          message:
            'Import path "#constants/values.ts" should be rewritten to "@/constants/values"',
        },
      ],
      output: "export { default } from '@/constants/values';",
    },

    // Multiple patterns - first match wins
    {
      code: "import api from '#api/client.ts';",
      options: [
        {
          patterns: [
            { from: "^#api/(.+)\\.ts$", to: "@/services/$1" },
            { from: "^#(.+)\\.ts$", to: "@/$1" },
          ],
        },
      ],
      errors: [
        {
          message:
            'Import path "#api/client.ts" should be rewritten to "@/services/client"',
        },
      ],
      output: "import api from '@/services/client';",
    },

    // Quote styles are preserved
    {
      code: 'import styles from "#styles/main.ts";',
      options: [{ patterns: [{ from: "^#(.+)\\.ts$", to: "@/$1" }] }],
      errors: [
        {
          message:
            'Import path "#styles/main.ts" should be rewritten to "@/styles/main"',
        },
      ],
      output: 'import styles from "@/styles/main";',
    },
  ],
});
