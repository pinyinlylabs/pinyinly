import { config, configs, plugins } from "@pinyinly/eslint-rules";

export default config(
  { plugins },

  // extends ...
  ...configs.recommended,
  ...configs.esm,
);
