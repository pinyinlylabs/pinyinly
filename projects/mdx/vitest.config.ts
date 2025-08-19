import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "#(.+)\\.ts$": "$1.ts",
    },
  },
});