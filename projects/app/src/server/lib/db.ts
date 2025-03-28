import { invariant } from "@haohaohow/lib/invariant";
import { GetColumnData, sql, SQL, SQLWrapper } from "drizzle-orm";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { AnyPgTable, PgTransactionConfig } from "drizzle-orm/pg-core";
import type { Pool as PgPool } from "pg";
import z from "zod";
import * as schema from "../schema";

export type Drizzle = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Drizzle[`transaction`]>[0]>[0];
export type TransactionBodyFn<R> = (tx: Transaction) => Promise<R>;

const envSchema = z.object({ DATABASE_URL: z.string().optional() });

export async function createPool(): Promise<PgPool> {
  const env = envSchema.parse(process.env);
  const IS_NEON = env.DATABASE_URL?.includes(`neon.tech`) === true;

  let Pool: typeof PgPool;
  if (IS_NEON) {
    // eslint-disable-next-line unicorn/no-await-expression-member
    Pool = (await import(`@neondatabase/serverless`)).Pool;
    const { neonConfig } = await import(`@neondatabase/serverless`);
    const { default: ws } = await import(`ws`);
    neonConfig.webSocketConstructor = ws;
  } else {
    // eslint-disable-next-line unicorn/no-await-expression-member
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

interface WithTransactionOptions {
  isolationLevel?: PgTransactionIsolationLevel;
  /**
   * Maximum number of attempts at executing the transaction.
   */
  maxAttempts?: number;
}

export async function withRetriableTransaction<R>(
  tx: Transaction | Drizzle,
  /**
   * Options for the transaction. If `retries` is not provided, the transaction
   * will be retried up to that many times in the event of a serialization
   * error.
   *
   * This is the second parameter to make code more readable top-to-bottom so
   * the isolation level is known as up-front context when reading the function
   * body.
   */
  options: WithTransactionOptions,
  body: TransactionBodyFn<R>,
): ReturnType<typeof body> {
  const maxAttempts = options.maxAttempts ?? 3;
  const isolationLevel = options.isolationLevel ?? pgIsolationLevelDefault;

  let attempt = 1;
  do {
    try {
      return await tx.transaction(body, { isolationLevel });
    } catch (error) {
      if (attempt < maxAttempts && isRetryablePgError(error)) {
        console.warn(
          `Retrying transaction due to some conflict violating the \`${isolationLevel}\` isolation level (attempt ${attempt})`,
          error,
        );
        continue;
      }
      throw error;
    }
  } while (attempt++);

  invariant(
    false,
    `unexpected code path reached, transaction failed maximum number of times but did not throw error`,
  );
}

/**
 * Convience function with isolation level set to `repeatable read`. Preferred
 * over using @see withRetriableTransaction because it's easier to read code
 * top-to-bottom and see the isolation level in context.
 *
 * @param tx
 * @param body @returns
 */
export async function withRepeatableReadTransaction<R>(
  tx: Transaction | Drizzle,
  body: TransactionBodyFn<R>,
): ReturnType<typeof body> {
  return await withRetriableTransaction(
    tx,
    {
      isolationLevel: `repeatable read`,
    },
    body,
  );
}

/**
 * Determine if retrying a transaction could fix it (useful for strict
 * transaction isolation levels where locks can cause conflicts).
 *
 * This is common (and expected) when using SERIALIZABLE isolation level, and
 * the transaction should be retried.
 *
 * See
 * https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and
 */
function isRetryablePgError(err: unknown) {
  // TODO: use zod to decode

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const code = typeof err === `object` ? String((err as any).code) : null;
  return code === `40001` || code === `40P01`;
}

export function json_agg<TTable extends PgTable>(col: TTable) {
  return sql<TTable[`$inferSelect`][]>`coalesce(json_agg(${col}),'[]')`;
}

export function substring<TCol extends PgColumn>(col: TCol, regex: RegExp) {
  return sql<string>`substring(${col} from ${regex.source})`;
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

export const pgIsolationLevelDefault =
  `read committed` satisfies PgTransactionIsolationLevel;

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

export function xmin<TFrom extends PgTable>(source: TFrom) {
  return sql<string>`${source}.xmin`;
}

/**
 * Efficiently update a single column across multiple rows using a single SQL
 * CTE and Drizzle's column serialization.
 */
export async function pgBatchUpdate<
  WhereColumn extends PgColumn,
  SetColumn extends PgColumn,
>(
  db: Drizzle,
  options: {
    whereColumn: WhereColumn;
    setColumn: SetColumn;
    updates: [
      where: GetColumnData<WhereColumn>,
      set: GetColumnData<SetColumn>,
    ][];
  },
): Promise<void> {
  const { whereColumn, setColumn, updates } = options;

  invariant(
    whereColumn.table === setColumn.table,
    `columns must be from the same table`,
  );

  if (updates.length === 0) {
    return;
  }

  const table = whereColumn.table;

  const values = sql.join(
    updates.map(([whereInput, setInput]) => {
      const whereValue = sql.param(whereColumn.mapToDriverValue(whereInput));
      const whereType = sql.raw(whereColumn.getSQLType());
      const setValue = sql.param(setColumn.mapToDriverValue(setInput));
      const setType = sql.raw(setColumn.getSQLType());
      return sql`select ${whereValue}::${whereType}, ${setValue}::${setType}`;
    }),
    sql` union all `,
  );

  const query = sql`
    with vals(where_value, set_value) as (${values})
    update ${table} as t
    set ${sql.identifier(setColumn.name)} = vals.set_value
    from vals
    where t.${sql.identifier(whereColumn.name)} = vals.where_value
  `;

  await db.execute(query);
}
