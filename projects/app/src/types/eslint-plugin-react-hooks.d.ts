// From https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/typings/eslint-plugin-react-hooks.d.ts
declare module "eslint-plugin-react-hooks" {
  import type {
    ClassicConfig,
    Linter,
  } from "@typescript-eslint/utils/ts-eslint";

  declare const exprt: {
    configs: {
      recommended: ClassicConfig.Config;
    };
    rules: NonNullable<Linter.Plugin[`rules`]>;
  };
  export = exprt;
}
