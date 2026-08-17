import reactNativeWeb from "vite-plugin-react-native-web";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    include: [`!test/**/*.browser.test.*`, `test/**/*.test.ts`],
    setupFiles: [`./test/setup.ts`],
    fakeTimers: {
      now: 0,
    },
    testTimeout: 30_000, // pglite can be slow
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [reactNativeWeb(), react()],
});
