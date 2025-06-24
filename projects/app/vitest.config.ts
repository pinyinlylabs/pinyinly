import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: `node`,
    setupFiles: [`./test/setup.ts`],
    include: [`./test/**/*.test.ts`, `./test/**/*.test.tsx`],
    fakeTimers: {
      now: 0,
    },
  },
  plugins: [tsconfigPaths(), react()],
});
