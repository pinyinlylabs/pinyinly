import reactNativeWeb from "vite-plugin-react-native-web";
import react from "@vitejs/plugin-react";
import { defineConfig, configDefaults } from "vitest/config";
import { transformWithOxc } from "vite";

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    exclude: [...configDefaults.exclude, `.minio/**`],
    include: [`!test/**/*.browser.test.*`, `test/**/*.test.{ts,tsx}`],
    setupFiles: [`./test/setup.ts`],
    server: {
      deps: {
        // These packages ship JSX/TSX that Node cannot execute directly. Let
        // Vite transform them; this regex matches resolved paths, not just names.
        inline: [/@rn-primitives\//u, `@expo/html-elements`],
      },
    },
    fakeTimers: {
      now: 0,
    },
    testTimeout: 30_000, // pglite can be slow
  },
  resolve: {
    tsconfigPaths: true,
  },
  environments: {
    client: {
      // happy-dom uses Vite's client environment, but runs in Node. Keep Node
      // imports in the shared test setup available instead of browser stubs.
      consumer: `server`,
      resolve: {
        // Keep the same packages in Vite's transform pipeline when happy-dom
        // loads modules through the client environment with server resolution.
        noExternal: [/@rn-primitives\//u, `@expo/html-elements`],
      },
    },
  },
  plugins: [
    reactNativeWeb(),
    react(),
    // @rn-primitives publishes raw JSX in .js/.mjs files, not .jsx files.
    // Parse those dependencies as JSX before Vite's normal module processing;
    // inlining alone does not change the parser selected by the file extension.
    {
      name: `native-primitives-jsx`,
      enforce: `pre`,
      async transform(code, id) {
        if (!/\/node_modules\/@rn-primitives\/.*\.[cm]?js$/u.test(id)) {
          return null;
        }
        return transformWithOxc(code, id, {
          lang: `jsx`,
          jsx: { runtime: `automatic` },
        });
      },
    },
  ],
});
