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
  resolve: {
    extensions: [
      // Putting .web extension first allows us to import expo-* modules because
      // it resolves the way Metro would do it for API routes.
      `.web.tsx`,
      `.tsx`,
      `.web.ts`,
      `.ts`,
      `.web.js`,
      `.js`,
      `.jsx`,
      `.json`,
    ],
    alias: {
      "react-native": `react-native-web`,
    },
  },
  plugins: [viteMdxPlugin(), tsconfigPaths(), react()],
  define: {
    __DEV__: `true`,
    "process.env.EXPO_OS": JSON.stringify(`web`),
  },
});
