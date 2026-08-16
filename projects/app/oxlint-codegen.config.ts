import { defineConfig } from "oxlint";

export default defineConfig({
  $schema: `../../node_modules/oxlint/configuration_schema.json`,
  jsPlugins: [
    {
      name: `pinyinly`,
      specifier: `@pinyinly/oxlint-rules`,
    },
  ],
  categories: {
    correctness: `off`,
    suspicious: `off`,
    pedantic: `off`,
    perf: `off`,
    style: `off`,
    restriction: `off`,
    nursery: `off`,
  },
  rules: {
    // Generates code based on other files in the file-system, so it's not
    // cache safe and is kept out of the main .oxlintrc.json rules, run only
    // via the separate `codegenOxlint` task instead.
    "pinyinly/glob-template": `error`,
  },
  options: {
    // This config doesn't run with `--type-aware`, so disable comments for
    // type-aware rules would otherwise be (incorrectly) flagged as unused.
    reportUnusedDisableDirectives: `off`,
    respectEslintDisableDirectives: false,
  },
  // `extends` doesn't inherit `ignorePatterns`, so repeat them here.
  ignorePatterns: [`**/*.d.ts`, `src/app/dev/**`],
});
