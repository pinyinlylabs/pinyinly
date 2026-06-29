import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    reporters: [
      `vitest-evals/reporter`,
      // Useful for seeing messages in evals to debug test failures manually.
      [`json`, { outputFile: `vitest.evals-report.json` }],
    ],
    include: [`test/**/*.eval.*`],
    testTimeout: 60_000, // calling LLM can be slow
  },
  plugins: [tsconfigPaths(), react()],
  define: {
    __DEV__: `true`,
  },
});
