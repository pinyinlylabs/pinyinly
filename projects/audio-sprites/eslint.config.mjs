import { configs, defineConfig, plugins } from "@pinyinly/eslint-rules";

export default defineConfig(
  { plugins },

  // extends ...
  configs.recommended,
  configs.esm,
);
