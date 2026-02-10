import {
  rAssetStatusKind,
  rFsrsRating,
  rHanziOrHanziWord,
  rHanziWord,
  rSkill,
  rSpaceSeparatedString,
} from "@/data/rizzleSchema";
import { isRunningTests } from "@/util/env";
import type { RizzleType, RizzleTypeDef } from "@/util/rizzle";
import { r } from "@/util/rizzle";
import { invariant } from "@pinyinly/lib/invariant";
import type { ColumnBaseConfig } from "drizzle-orm";
import { Table } from "drizzle-orm";
import type * as s from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { base64url } from "jose";
import { z } from "zod/v4";
import type * as z4 from "zod/v4/core";

type PgCustomColumn = s.PgCustomColumn<
  ColumnBaseConfig<`custom`, `PgCustomColumn`>
>;

function unstable__columnName(column: PgCustomColumn): string {
  // oxlint-disable-next-line typescript/no-explicit-any
  const tableName = (column.table as any)[
    // oxlint-disable-next-line typescript/no-unsafe-member-access, typescript/no-explicit-any
    (Table as any).Symbol.Name as symbol
  ] as string;

  invariant(
    tableName != null,
    `could not introspect table name, maybe drizzle internals changed`,
  );

  const columnName = column.name;
  invariant(
    columnName != null,
    `could not introspect column name, maybe drizzle internals changed`,
  );

  return `${tableName}.${columnName}`;
}

/**
 * Adds the table and column name to Zod parsing errors to help debugging.
 */
function drizzleColumnTypeEnhancedErrors(column: PgCustomColumn) {
  if (isRunningTests || __DEV__) {
    // *always* run this code path so that it fails loudly in tests/dev, rather
    // than only in the case of a zod parsing.
    unstable__columnName(column);
  }

  return (ctx: z4.$ZodCatchCtx) => {
    throw new Error(
      `could not parse DB value at "${unstable__columnName(column)}"`,
      { cause: ctx.issues },
    );
  };
}

/**
 * Adds the table and column name to Zod parsing errors to help debugging.
 */
function debugFriendlyErrorFactory(column: PgCustomColumn) {
  if (isRunningTests || __DEV__) {
    // *always* run this code path so that it fails loudly in tests/dev, rather
    // than only in the case of a zod parsing. This is because it relies on
    // unstable internal APIs that are fragile to rely upon.
    unstable__columnName(column);
  }

  return (issues: readonly z4.$ZodIssue[]) =>
    new Error(`could not parse DB value at "${unstable__columnName(column)}"`, {
      cause: issues,
    });
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

export const zodJson = <T extends z.ZodType>(name: string, schema: T) => {
  // Avoid creating a new Zod schema each time a value is decoded.
  let fromDriverSchemaMemo: z.ZodCatch<T> | undefined;

  return customType<{ data: z.infer<T>; driverData: string }>({
    dataType() {
      return `json`;
    },
    fromDriver(
      // hack: expose drizzle internals
      this: PgCustomColumn,
      value,
    ) {
      return (fromDriverSchemaMemo ??= schema.catch(
        drizzleColumnTypeEnhancedErrors(this),
      )).parse(value);
    },
    toDriver(
      // hack: expose drizzle internals
      this: PgCustomColumn,
      value,
    ) {
      return jsonStringifyEnhancedErrors(this, value);
    },
  })(name);
};

export const pgBase64url = (name: string) =>
  customType<{ data: Uint8Array; driverData: string }>({
    dataType() {
      return `text`;
    },
    fromDriver(value) {
      return base64url.decode(value);
    },
    toDriver(value) {
      return base64url.encode(value);
    },
  })(name);

export const pgZod = <
  DataType extends `text` | `json`,
  IO extends DataType extends `text` ? string : unknown,
  T extends z4.$ZodType<IO, IO>,
>(
  schema: T,
  pgDataType: DataType,
) => {
  let errorFactory: ((issues: readonly z4.$ZodIssue[]) => Error) | undefined;

  return customType<{ data: z4.output<T>; driverData: string }>({
    dataType() {
      return pgDataType;
    },
    fromDriver(
      // hack to expose column name
      this: PgCustomColumn,
      value,
    ) {
      errorFactory ??= debugFriendlyErrorFactory(this);

      const result = z.safeParse(schema, value);
      if (result.success) {
        return result.data;
      }

      throw errorFactory(result.error.issues);
    },
    toDriver(
      // hack to expose column name
      this: PgCustomColumn,
      value: z4.output<T>,
    ) {
      errorFactory ??= debugFriendlyErrorFactory(this);

      const result = z.safeParse(schema, value);
      if (result.success) {
        return pgDataType === `json`
          ? jsonStringifyEnhancedErrors(this, result.data)
          : (result.data as string);
      }

      throw errorFactory(result.error.issues);
    },
  });
};

export const rizzleCustomType = <
  DataType extends `text` | `json`,
  I,
  M extends DataType extends `text` ? string : unknown,
  O,
  T extends RizzleType<RizzleTypeDef, I, M, O>,
>(
  rizzleType: T,
  pgDataType: DataType,
) => {
  let errorFactory: ((issues: readonly z4.$ZodIssue[]) => Error) | undefined;
  const unmarshalSchema = rizzleType.getUnmarshal();
  const marshalSchema = rizzleType.getMarshal();

  return customType<{ data: T[`_output`]; driverData: string }>({
    dataType() {
      return pgDataType;
    },
    fromDriver(
      // hack to expose column name
      this: PgCustomColumn,
      value,
    ) {
      errorFactory ??= debugFriendlyErrorFactory(this);

      const result = z.safeParse(unmarshalSchema, value);
      if (result.success) {
        return result.data;
      }

      throw errorFactory(result.error.issues);
    },
    toDriver(
      // hack to expose column name
      this: PgCustomColumn,
      value: T[`_output`],
    ) {
      errorFactory ??= debugFriendlyErrorFactory(this);

      const result = z.safeParse(marshalSchema, value);
      if (result.success) {
        return pgDataType === `json`
          ? jsonStringifyEnhancedErrors(this, result.data)
          : (result.data as string);
      }

      throw errorFactory(result.error.issues);
    },
  });
};

// The "s" prefix follows the convention of "s" being drizzle things. This helps
// differentiate them from rizzle schema things.
export const pgSkill = rizzleCustomType(rSkill(), `text`);
export const pgMnemonicThemeId = rizzleCustomType(r.string(), `text`);
export const pgSpaceSeparatedString = rizzleCustomType(
  rSpaceSeparatedString(),
  `text`,
);
export const pgHanziOrHanziWord = rizzleCustomType(rHanziOrHanziWord(), `text`);
const pgHanziWordBuilder = rizzleCustomType(rHanziWord(), `text`);
export function pgHanziWord(name: string) {
  return pgHanziWordBuilder(name);
}
export const pgJson = rizzleCustomType(r.json(), `json`);
export const pgJsonObject = rizzleCustomType(r.jsonObject(), `json`);
export const pgFsrsRating = rizzleCustomType(rFsrsRating(), `text`);
export const pgAssetStatusKind = rizzleCustomType(rAssetStatusKind(), `text`);

// Auth
export const passkeyTransportEnumSchema = z.enum([
  `ble`,
  `cable`,
  `hybrid`,
  `internal`,
  `nfc`,
  `smart-card`,
  `usb`,
]);
export const pgPasskeyTransport = pgZod(passkeyTransportEnumSchema, `text`);
