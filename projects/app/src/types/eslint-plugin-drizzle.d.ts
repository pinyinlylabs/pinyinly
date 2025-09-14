// From https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/typings/eslint-plugin-react.d.ts
declare module "eslint-plugin-drizzle" {
  import type { ESLint, Linter } from "eslint";

  declare const exprt: ESLint.Plugin & {
    configs: {
      recommended: Linter.LegacyConfig;
      all: Linter.LegacyConfig;
      "jsx-runtime": Linter.LegacyConfig;
    };
  };
  export = exprt;
}
