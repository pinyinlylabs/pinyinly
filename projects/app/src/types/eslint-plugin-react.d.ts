// From https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/typings/eslint-plugin-react.d.ts
declare module "eslint-plugin-react" {
  import type {
    ClassicConfig,
    Linter,
  } from "@typescript-eslint/utils/ts-eslint";

  declare const exprt: {
    configs: {
      recommended: ClassicConfig.Config;
      all: ClassicConfig.Config;
      "jsx-runtime": ClassicConfig.Config;
    };
    rules: NonNullable<Linter.Plugin[`rules`]>;
  };
  export = exprt;
}
