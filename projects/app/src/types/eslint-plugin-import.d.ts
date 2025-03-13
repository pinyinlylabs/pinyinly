// From https://github.com/typescript-eslint/typescript-eslint/blob/41323746de299e6d62b4d6122975301677d7c8e0/typings/eslint-plugin-import.d.ts
declare module "eslint-plugin-import" {
  import type {
    ClassicConfig,
    Linter,
  } from "@typescript-eslint/utils/ts-eslint";

  declare const exprt: {
    configs: {
      recommended: ClassicConfig.Config;
      errors: ClassicConfig.Config;
      warnings: ClassicConfig.Config;
      "stage-0": ClassicConfig.Config;
      react: ClassicConfig.Config;
      "react-native": ClassicConfig.Config;
      electron: ClassicConfig.Config;
      typescript: ClassicConfig.Config;
    };
    rules: NonNullable<Linter.Plugin[`rules`]>;
  };
  export = exprt;
}
