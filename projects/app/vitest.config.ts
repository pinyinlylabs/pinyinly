import { viteMdxPlugin } from "@pinyinly/mdx/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    setupFiles: [`./test/setup.ts`],
    fakeTimers: {
      now: 0,
    },
    testTimeout: 30_000, // pglite can be slow
  },
  plugins: [viteMdxPlugin(), tsconfigPaths(), react()],
});
