import * as r from "@/data/rizzleSchema";
import { RizzleType, RizzleTypeDef } from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import { ColumnBaseConfig, Table } from "drizzle-orm";
import * as s from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { z, ZodError } from "zod";

type PgCustomColumn = s.PgCustomColumn<
  ColumnBaseConfig<`custom`, `PgCustomColumn`>
>;

function unstable__columnName(column: PgCustomColumn): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableName = (column.table as any)[
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (Table as any).Symbol.Name as symbol
  ] as string;

  invariant(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    tableName != null,
    `could not introspect table name, maybe drizzle internals changed`,
  );

  const columnName = column.name;
  invariant(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    columnName != null,
    `could not introspect column name, maybe drizzle internals changed`,
  );

  return `${tableName}.${columnName}`;
}

/**
 * Adds the table and column name to Zod parsing errors to help debugging.
 */
function drizzleColumnTypeEnhancedErrors(column: PgCustomColumn) {
  if (`NODE_TEST_CONTEXT` in process.env || __DEV__) {
    // *always* run this code path so that it fails loudly in tests/dev, rather
    // than only in the case of a zod parsing.
    unstable__columnName(column);
  }

  return (ctx: { error: ZodError }) => {
    throw new Error(
      `could not parse DB value at "${unstable__columnName(column)}"`,
      { cause: ctx.error },
    );
  };
}

function jsonStringifyEnhancedErrors(
  column: PgCustomColumn,
  value: unknown,
): string {
  if (`NODE_TEST_CONTEXT` in process.env || __DEV__) {
    // *always* run this code path so that it fails loudly in tests/dev, rather
    // than only in the case of a zod parsing.
    unstable__columnName(column);
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new Error(
      `could not JSON.stringify() value for column "${unstable__columnName(column)}"`,
      { cause: error },
    );
  }
}

export const zodJson = <T extends z.ZodTypeAny>(name: string, schema: T) =>
  customType<{ data: z.infer<T>; driverData: string }>({
    dataType() {
      return `json`;
    },
    fromDriver(
      this: PgCustomColumn, // hack: expose drizzle internals
      value,
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return schema.catch(drizzleColumnTypeEnhancedErrors(this)).parse(value);
    },
    toDriver(
      this: PgCustomColumn, // hack: expose drizzle internals
      value,
    ) {
      return jsonStringifyEnhancedErrors(this, value);
    },
  })(name);

export const rizzleCustomType = <
  DataType extends `text` | `json`,
  I,
  M extends DataType extends `text` ? string : unknown,
  O,
  T extends RizzleType<RizzleTypeDef, I, M, O>,
>(
  rizzleType: T,
  dataType: DataType,
) =>
  customType<{ data: T[`_output`]; driverData: string }>({
    dataType() {
      return dataType;
    },
    fromDriver(
      this: PgCustomColumn, // hack
      value,
    ) {
      return rizzleType
        .getUnmarshal()
        .catch(drizzleColumnTypeEnhancedErrors(this))
        .parse(value);
    },
    toDriver(
      this: PgCustomColumn, // hack
      value: T[`_output`],
    ) {
      const marshaled = rizzleType
        .getMarshal()
        .catch(drizzleColumnTypeEnhancedErrors(this))
        .parse(value);
      return dataType === `json`
        ? jsonStringifyEnhancedErrors(this, marshaled)
        : (marshaled as string);
    },
  });

// The "s" prefix follows the convention of "s" being drizzle things. This helps
// differentiate them from rizzle schema things.
export const sSkill = rizzleCustomType(r.rSkill(), `text`);
export const sMnemonicThemeId = rizzleCustomType(r.rMnemonicThemeId, `text`);
export const sPinyinInitialGroupId = rizzleCustomType(
  r.rPinyinInitialGroupId,
  `text`,
);
export const sFsrsRating = rizzleCustomType(r.rFsrsRating, `text`);
