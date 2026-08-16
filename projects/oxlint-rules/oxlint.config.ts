import { defineConfig } from "oxlint";
import { baseConfig } from "@pinyinly/oxlint-rules";

export default defineConfig({
  extends: [baseConfig],
  options: {
    reportUnusedDisableDirectives: "error",
    respectEslintDisableDirectives: false,
  },
});
