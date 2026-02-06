import { createPool } from "#server/lib/db.js";
import * as schema from "#server/pgSchema.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const pool = await createPool();
const client = await pool.connect();

await migrate(drizzle(client, { schema }), {
  migrationsFolder: `drizzle`,
});

client.release();
await pool.end();
