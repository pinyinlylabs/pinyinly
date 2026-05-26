import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    reporters: [`vitest-evals/reporter`],
    include: [`test/**/*.eval.*`],
    testTimeout: 60_000, // calling LLM can be slow
  },
  plugins: [tsconfigPaths(), react()],
  define: {
    __DEV__: `true`,
  },
});
