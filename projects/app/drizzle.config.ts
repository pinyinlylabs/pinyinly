import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: `./src/server/pgSchema.ts`,
  out: `./drizzle`,
  dialect: `postgresql`,
});
