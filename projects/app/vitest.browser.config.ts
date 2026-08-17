import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import reactNativeWeb from "vite-plugin-react-native-web";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { uniwind } from "uniwind/vite";

export default defineConfig({
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: `chromium` }],
    },
    include: [`**/*.browser.test.{ts,tsx}`],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    reactNativeWeb(),
    react(),
    tailwindcss(),
    uniwind({
      cssEntryFile: `./src/global.css`,
      dtsFile: `./uniwind-env.d.ts`,
      extraThemes: [
        `dark-danger-panel`,
        `dark-grass-panel`,
        `dark-placeholder-panel`,
        `dark-popover`,
        `dark-sky-panel`,
        `dark-success-panel`,
        `dark-warning-panel`,
        `dark`,
        `light-danger-panel`,
        `light-grass-panel`,
        `light-placeholder-panel`,
        `light-popover`,
        `light-sky-panel`,
        `light-success-panel`,
        `light-warning-panel`,
        `light`,
      ],
    }),
  ],
});
