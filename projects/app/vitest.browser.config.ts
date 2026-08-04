import react from "@vitejs/plugin-react";
import reactNativeWeb from "vite-plugin-react-native-web";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

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
  plugins: [reactNativeWeb(), react()],
});
