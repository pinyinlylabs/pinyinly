import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: `./src/server/schema.ts`,
  out: `./drizzle`,
  dialect: `postgresql`,
});
