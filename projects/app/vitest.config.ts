import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    // Keep Expo packages in Vite's transform pipeline during SSR.
    // Many Expo modules ship ESM/React Native entrypoints that break when
    // treated as external CJS dependencies in the Node test runtime.
    noExternal: [/^expo(?:-|$|\/)/u, /^@expo(?:-|$|\/)/u],
  },
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    server: {
      deps: {
        // Match the SSR rule above for Vitest's dependency server so imports
        // are transformed consistently in both module loading paths.
        inline: [/^expo(?:-|$|\/)/u, /^@expo(?:-|$|\/)/u],
      },
    },
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
  plugins: [tsconfigPaths(), react()],
  define: {
    __DEV__: `true`,
    "process.env.EXPO_OS": JSON.stringify(`web`),
  },
});
