declare module "@inngest/eslint-plugin" {
  import type { ESLint, Linter } from "eslint";

  const exprt: ESLint.Plugin & {
    configs: {
      recommended: Linter.LegacyConfig;
    };
  };
  export = exprt;
}
