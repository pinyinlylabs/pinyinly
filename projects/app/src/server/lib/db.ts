import { invariant } from "@haohaohow/lib/invariant";
import { sql, SQL, SQLWrapper } from "drizzle-orm";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  AnyPgTable,
  PgColumn,
  PgTable,
  PgTransactionConfig,
} from "drizzle-orm/pg-core";
import type { Pool as PgPool } from "pg";
import z from "zod";
import * as schema from "../schema";

export type Drizzle = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Drizzle[`transaction`]>[0]>[0];
export type TransactionBodyFn<R> = (tx: Transaction) => Promise<R>;

export async function createPool(): Promise<PgPool> {
  const env = z.object({ DATABASE_URL: z.string() }).parse(process.env);
  const IS_NEON = env.DATABASE_URL.includes(`neon.tech`);

  let Pool: typeof PgPool;
  if (IS_NEON) {
    Pool = (await import(`@neondatabase/serverless`)).Pool;
    const { neonConfig } = await import(`@neondatabase/serverless`);
    const { default: ws } = await import(`ws`);
    neonConfig.webSocketConstructor = ws;
  } else {
    Pool = (await import(`pg`)).default.Pool;
  }

  const pool = new Pool({ connectionString: env.DATABASE_URL });

  // the pool will emit an error on behalf of any idle clients
  // it contains if a backend error or network partition happens
  pool.on(`error`, (err) => {
    console.error(`Unexpected error on idle pool client`, err);
  });

  return pool;
}

async function withDrizzleAndPool<R>(
  f: (db: Drizzle) => Promise<R>,
  pool: PgPool,
): Promise<R> {
  const client = await pool.connect();

  try {
    const db = drizzle(client, { schema });
    return await f(db);
  } finally {
    client.release();
  }
}

export async function withDrizzle<R>(f: (db: Drizzle) => Promise<R>) {
  const pool = await createPool();
  try {
    return await withDrizzleAndPool(f, pool);
  } finally {
    await pool.end();
  }
}

export async function transactWithExecutor<R>(
  tx: Transaction | Drizzle,
  body: TransactionBodyFn<R>,
) {
  let retries = 3;
  do {
    try {
      return await tx.transaction(body);
    } catch (e) {
      if (retries > 0 && shouldRetryTransaction(e)) {
        console.warn(
          `Retrying transaction due to SERIALIZABLE isolation error (attempt ${retries})`,
          e,
        );
        continue;
      }
      throw e;
    }
  } while (retries-- > 0);
}

// Because we are using SERIALIZABLE isolation level, we need to be prepared to retry transactions.
// stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and
function shouldRetryTransaction(err: unknown) {
  // TODO: use zod to decode

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const code = typeof err === `object` ? String((err as any).code) : null;
  return code === `40001` || code === `40P01`;
}

/**
 * Invokes a supplied function within a transaction.
 * @param body Function to invoke. If this throws, the transaction will be rolled
 * back. The thrown error will be re-thrown.
 */
export async function transact<R>(body: TransactionBodyFn<R>) {
  return await withDrizzle(async (executor) => {
    return await transactWithExecutor(executor, body);
  });
}

export function json_agg<TTable extends PgTable>(col: TTable) {
  return sql<TTable[`$inferSelect`][]>`coalesce(json_agg(${col}),'[]')`;
}

export function array_agg<TCol extends PgColumn>(col: TCol) {
  return sql<
    TCol[`_`][`data`][]
  >`coalesce(array_agg(${col}),ARRAY[]::${sql.raw(col.getSQLType())}[])`;
}

export function json_object_agg<
  TCol1 extends SQLWrapper,
  TCol2 extends SQLWrapper,
>(col1: TCol1, col2: TCol2) {
  return sql<
    Record<
      string,
      TCol2 extends PgColumn
        ? TCol2[`_`][`data`]
        : TCol2 extends AnyPgTable
          ? TCol2[`$inferSelect`]
          : TCol2 extends SQL<infer T>
            ? T
            : never
    >
  >`coalesce(json_object_agg(${col1},${col2}),'{}')`;
}

export function json_build_object<const T extends Record<string, SQLWrapper>>(
  json: T,
) {
  const start = sql`json_build_object(`;
  const end = sql`)`;

  const values = Object.entries(json).map(([k, value], idx, arr) => {
    return sql`'${sql.raw(k)}',${value} ${sql.raw(idx === arr.length - 1 ? `` : `,`)}`;
  });

  return sql.join([start, ...values, end]) as SQL<{
    [key in keyof T]: T[key] extends PgColumn
      ? T[key][`_`][`data`]
      : T[key] extends AnyPgTable
        ? T[key][`$inferSelect`]
        : T[key] extends SQL<infer T>
          ? T
          : never;
  }>;
}

export type PgTransactionIsolationLevel = NonNullable<
  PgTransactionConfig[`isolationLevel`]
>;

const pgIsolationLevelPower = {
  [`read uncommitted`]: 0,
  [`read committed`]: 1,
  [`repeatable read`]: 2,
  [`serializable`]: 3,
};

export async function assertMinimumIsolationLevel(
  tx: Drizzle,
  isolationLevel: PgTransactionIsolationLevel,
): Promise<void> {
  const result = await tx.execute<{
    transaction_isolation: PgTransactionIsolationLevel;
  }>(sql`SHOW TRANSACTION ISOLATION LEVEL`);
  const currentIsolationLevel = result.rows[0]?.transaction_isolation;
  invariant(currentIsolationLevel != null);

  invariant(
    pgIsolationLevelPower[currentIsolationLevel] >=
      pgIsolationLevelPower[isolationLevel],
    `incorrect transaction_isolation, expected "${isolationLevel}", actual "${currentIsolationLevel}"`,
  );
}
