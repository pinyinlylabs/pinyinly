import {
  mapInvert,
  memoize0,
  objectInvert,
  weakMemoize1,
} from "@/util/collections";
import { invariant } from "@haohaohow/lib/invariant";
import fromAsync from "array-from-async";
import mapKeys from "lodash/mapKeys";
import mapValues from "lodash/mapValues";
import memoize from "lodash/memoize";
import {
  IndexDefinition,
  MutatorDefs,
  ReadonlyJSONValue,
  ReadTransaction,
  Replicache,
  ReplicacheOptions,
  WriteTransaction,
} from "replicache";
import { AnyFunction } from "ts-essentials";
import { z } from "zod";

export interface RizzleTypeDef {
  description?: string;
}

export abstract class RizzleType<
  Def extends RizzleTypeDef = RizzleTypeDef,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Marshaled = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Output = any,
> {
  readonly _input!: Input;
  readonly _output!: Output;
  readonly _marshaled!: Marshaled;
  readonly _def!: Def;

  abstract getMarshal(): z.ZodType<Marshaled, z.ZodTypeDef, Input>;
  abstract getUnmarshal(): z.ZodType<Output, z.ZodTypeDef, Marshaled>;
  abstract marshal(input: Input): Marshaled;
  abstract unmarshal(marshaled: Marshaled): Output;

  static #indexes = {};

  _getIndexes(): RizzleIndexDefinitions {
    return RizzleType.#indexes;
  }

  _getAlias(): string | undefined {
    return undefined;
  }

  constructor(def: Def) {
    this._def = def;
  }

  alias(alias: string): RizzleTypeAlias<this> {
    return RizzleTypeAlias.create(this, alias);
  }

  nullable(): RizzleNullable<this> {
    return RizzleNullable.create(this);
  }

  indexed<
    // Replicache only supports indexing string values (i.e. so the Marshaled
    // value must be string)
    This extends RizzleType<RizzleTypeDef, unknown, string>,
    IndexName extends string,
  >(this: This, indexName: IndexName) {
    return RizzleIndexed.create(this, indexName);
  }
}

interface RizzleNullableDef<T extends RizzleType> extends RizzleTypeDef {
  innerType: T;
  typeName: `nullable`;
}

export class RizzleNullable<T extends RizzleType> extends RizzleType<
  RizzleNullableDef<T>,
  T[`_input`] | null,
  T[`_marshaled`] | null,
  T[`_output`] | null
> {
  constructor(def: RizzleNullableDef<T>) {
    super(def);

    this.getMarshal = memoize0(this.getMarshal.bind(this));
    this.getUnmarshal = memoize0(this.getUnmarshal.bind(this));
    this.marshal = weakMemoize1(this.marshal.bind(this));
    this.unmarshal = weakMemoize1(this.unmarshal.bind(this));
  }

  getMarshal() {
    return this._def.innerType.getMarshal().nullable();
  }

  getUnmarshal() {
    return this._def.innerType.getUnmarshal().nullable();
  }

  marshal(input: this[`_input`]): this[`_marshaled`] {
    return this.getMarshal().parse(input);
  }

  unmarshal(marshaled: T[`_marshaled`]): T[`_output`] {
    return this.getUnmarshal().parse(marshaled);
  }

  _getIndexes() {
    return this._def.innerType._getIndexes();
  }

  _getAlias(): string | undefined {
    return this._def.innerType._getAlias();
  }

  static create = <T extends RizzleType>(type: T): RizzleNullable<T> => {
    return new RizzleNullable({ innerType: type, typeName: `nullable` });
  };
}

interface RizzleTypeAliasDef<T extends RizzleType> extends RizzleTypeDef {
  innerType: T;
  alias?: string | undefined;
  typeName: `alias`;
}

export class RizzleTypeAlias<T extends RizzleType> extends RizzleType<
  RizzleTypeAliasDef<T>,
  T[`_input`],
  T[`_marshaled`],
  T[`_output`]
> {
  getMarshal() {
    return this._def.innerType.getMarshal();
  }
  getUnmarshal() {
    return this._def.innerType.getUnmarshal();
  }
  marshal(input: T[`_input`]): T[`_marshaled`] {
    return this._def.innerType.marshal(input);
  }
  unmarshal(marshaled: T[`_marshaled`]): T[`_output`] {
    return this._def.innerType.unmarshal(marshaled);
  }
  _getIndexes() {
    return this._def.innerType._getIndexes();
  }
  _getAlias(): string | undefined {
    return this._def.alias;
  }

  static create = <T extends RizzleType>(
    type: T,
    alias: string | undefined,
  ): RizzleTypeAlias<T> => {
    return new RizzleTypeAlias({ innerType: type, alias, typeName: `alias` });
  };
}

interface RizzleIndexedDef<T extends RizzleType, IndexName extends string>
  extends RizzleTypeDef {
  innerType: T;
  indexName: IndexName;
  typeName: `indexed`;
}

export class RizzleIndexed<
  T extends RizzleType,
  IndexName extends string,
> extends RizzleType<
  RizzleIndexedDef<T, IndexName>,
  T[`_input`],
  T[`_marshaled`],
  T[`_output`]
> {
  constructor(def: RizzleIndexedDef<T, IndexName>) {
    super(def);

    this._getIndexes = memoize0(this._getIndexes.bind(this));
  }

  getMarshal() {
    return this._def.innerType.getMarshal();
  }
  getUnmarshal() {
    return this._def.innerType.getUnmarshal();
  }
  marshal(input: T[`_input`]): T[`_marshaled`] {
    return this._def.innerType.marshal(input);
  }
  unmarshal(marshaled: T[`_marshaled`]): T[`_output`] {
    return this._def.innerType.unmarshal(marshaled);
  }
  _getIndexes(): RizzleIndexDefinitions {
    return {
      [this._def.indexName]: {
        allowEmpty: false,
        jsonPointer: ``,
        marshal: this.marshal.bind(this),
      },
      ...this._def.innerType._getIndexes(),
    };
  }
  _getAlias() {
    return this._def.innerType._getAlias();
  }

  static create = <T extends RizzleType, IndexName extends string>(
    type: T,
    indexName: IndexName,
  ): RizzleIndexed<T, IndexName> => {
    return new RizzleIndexed({
      innerType: type,
      indexName,
      typeName: `indexed`,
    });
  };
}

interface RizzleObjectDef<T extends RizzleRawObject = RizzleRawObject>
  extends RizzleTypeDef {
  shape: T;
  typeName: `object`;
}

interface RizzleIndexDefinition<T> extends IndexDefinition {
  marshal: (input: T) => string;
}

type RizzleIndexDefinitions = Record<string, RizzleIndexDefinition<unknown>>;

export class RizzleObject<T extends RizzleRawObject> extends RizzleType<
  RizzleObjectDef<T>,
  RizzleObjectInput<T>,
  RizzleObjectMarshaled<T>,
  RizzleObjectOutput<T>
> {
  #keyToAlias: Record<string, string>;
  #aliasToKey: Record<string, string>;

  constructor(def: RizzleObjectDef<T>) {
    super(def);

    this.#keyToAlias = mapValues(this._def.shape, (v, k) => v._getAlias() ?? k);
    this.#aliasToKey = objectInvert(this.#keyToAlias);

    // Check that there are no overlapping aliases.
    const aliasNames = new Set(Object.keys(this.#aliasToKey));
    const keyNames = new Set(Object.keys(this._def.shape));
    if (aliasNames.size < keyNames.size) {
      const missing = new Set([...keyNames].filter((x) => !aliasNames.has(x)));
      invariant(false, `alias conflict for fields: ${[...missing].join(`, `)}`);
    }

    this.getMarshal = memoize0(this.getMarshal.bind(this));
    this.getUnmarshal = memoize0(this.getUnmarshal.bind(this));
    this._getIndexes = memoize0(this._getIndexes.bind(this));
    this.marshal = weakMemoize1(this.marshal.bind(this));
    this.unmarshal = weakMemoize1(this.unmarshal.bind(this));
  }

  getMarshal() {
    return z
      .object(mapValues(this._def.shape, (v) => v.getMarshal()))
      .transform((x) =>
        mapKeys(x, (_v, k) => this.#keyToAlias[k]),
      ) as unknown as z.ZodType<
      RizzleObjectMarshaled<T>,
      z.ZodAnyDef,
      RizzleObjectInput<T>
    >;
  }

  getUnmarshal() {
    return z
      .object(
        mapValues(
          mapKeys(this._def.shape, (_v, k) => this.#keyToAlias[k]),
          (x) => x.getUnmarshal(),
        ),
      )
      .transform((x) =>
        mapKeys(x, (_v, k) => this.#aliasToKey[k]),
      ) as unknown as z.ZodType<
      RizzleObjectOutput<T>,
      z.ZodAnyDef,
      RizzleObjectMarshaled<T>
    >;
  }

  marshal(input: RizzleObjectInput<T>): RizzleObjectMarshaled<T> {
    return this.getMarshal().parse(input);
  }

  unmarshal(input: RizzleObjectMarshaled<T>): RizzleObjectOutput<T> {
    return this.getUnmarshal().parse(input);
  }

  _getIndexes(): RizzleIndexDefinitions {
    // eslint-disable-next-line unicorn/no-array-reduce
    return Object.entries(this._def.shape).reduce<RizzleIndexDefinitions>(
      (acc, [key, rizzleType]) => ({
        ...acc,
        ...mapValues(rizzleType._getIndexes(), (v) => ({
          ...v,
          jsonPointer: `/${rizzleType._getAlias() ?? key}${v.jsonPointer}`,
        })),
      }),
      {},
    );
  }

  static create = <T extends RizzleRawObject>(shape: T): RizzleObject<T> => {
    return new RizzleObject({ shape, typeName: `object` });
  };
}

interface RizzleCustomDef<I, M, O> extends RizzleTypeDef {
  marshal: z.ZodType<M, z.ZodTypeDef, I>;
  unmarshal: z.ZodType<O, z.ZodTypeDef, M>;
  typeName: `custom`;
}

/**
 * A simple type that can be marshaled and unmarshaled.
 */
export class RizzleCustom<I, M, O = I> extends RizzleType<
  RizzleCustomDef<I, M, O>,
  I,
  M,
  O
> {
  static #defaultIndexes = {};

  constructor(def: RizzleCustomDef<I, M, O>) {
    super(def);

    this.marshal = weakMemoize1(this.marshal.bind(this));
    this.unmarshal = weakMemoize1(this.unmarshal.bind(this));
  }

  getMarshal() {
    return this._def.marshal;
  }

  getUnmarshal() {
    return this._def.unmarshal;
  }

  _getIndexes() {
    return RizzleCustom.#defaultIndexes;
  }

  _getAlias(): string | undefined {
    return;
  }

  marshal(options: this[`_input`]): this[`_marshaled`] {
    return this._def.marshal.parse(options);
  }

  unmarshal(options: this[`_marshaled`]): this[`_output`] {
    return this._def.unmarshal.parse(options);
  }

  static create = <I, M, O>(
    marshal: z.ZodType<M, z.ZodTypeDef, I>,
    unmarshal: z.ZodType<O, z.ZodTypeDef, M>,
  ): RizzleCustom<I, M, O> => {
    return new RizzleCustom({ marshal, unmarshal, typeName: `custom` });
  };
}

abstract class RizzleRoot<Def extends RizzleTypeDef = RizzleTypeDef> {
  _def: Def;

  constructor(def: Def) {
    this._def = def;
  }
}

type RizzleRawSchemaForKeyPath<KeyPath extends string> = Record<
  ExtractVariableNames<KeyPath>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RizzleType<RizzleTypeDef, any, string>
>;

type EntityKeyType<
  S extends RizzleRawObject,
  KeyPath extends string,
> = RizzleObject<Pick<S, ExtractVariableNames<KeyPath>>>;

type EntityValueType<S extends RizzleRawObject> = RizzleObject<S>;

interface RizzleEntityDef<KeyPath extends string, S extends RizzleRawObject>
  extends RizzleTypeDef {
  keyPath: KeyPath;
  valueType: EntityValueType<S>;
  interpolateKey: (
    key: Partial<EntityKeyType<S, KeyPath>[`_input`]>,
    allowPartial?: boolean,
  ) => string;
  typeName: `entity`;
}

export class RizzleEntity<
  KeyPath extends string,
  S extends RizzleRawObject,
> extends RizzleRoot<RizzleEntityDef<KeyPath, S>> {
  constructor(def: RizzleEntityDef<KeyPath, S>) {
    super(def);

    this.marshalKey = weakMemoize1(this.marshalKey.bind(this));
    this.marshalValue = weakMemoize1(this.marshalValue.bind(this));
    this.unmarshalValue = weakMemoize1(this.unmarshalValue.bind(this));
    this.getIndexes = memoize0(this.getIndexes.bind(this));
  }

  async has(
    tx: ReadTransaction,
    key: EntityKeyType<S, KeyPath>[`_input`],
  ): Promise<boolean> {
    return await tx.has(this.marshalKey(key));
  }

  async get(
    tx: ReadTransaction,
    key: EntityKeyType<S, KeyPath>[`_input`],
  ): Promise<EntityValueType<S>[`_output`] | undefined> {
    const valueData = await tx.get(this.marshalKey(key));
    if (valueData === undefined) {
      return valueData;
    }
    return this._def.valueType.unmarshal(
      valueData as typeof this._def.valueType._marshaled,
    );
  }

  async set(
    tx: WriteTransaction,
    key: EntityKeyType<S, KeyPath>[`_input`],
    value: EntityValueType<S>[`_input`],
  ) {
    await tx.set(
      this.marshalKey(key),
      this.marshalValue(value) as ReadonlyJSONValue,
    );
  }

  getIndexes() {
    return mapValues(this._def.valueType._getIndexes(), (v) => {
      const firstVarIndex = this._def.keyPath.indexOf(`[`);
      return {
        ...v,
        jsonPointer: v.jsonPointer,
        allowEmpty: v.allowEmpty,
        prefix:
          firstVarIndex > 0
            ? this._def.keyPath.slice(0, firstVarIndex)
            : this._def.keyPath,
      };
    }) as RizzleIndexTypes<EntityValueType<S>>;
  }

  marshalKey(input: EntityKeyType<S, KeyPath>[`_input`]) {
    return this._def.interpolateKey(input);
  }

  marshalValue(
    input: EntityValueType<S>[`_input`],
  ): EntityValueType<S>[`_marshaled`] {
    return this._def.valueType.marshal(input);
  }

  unmarshalValue(
    marshaled: EntityValueType<S>[`_marshaled`],
  ): EntityValueType<S>[`_output`] {
    return this._def.valueType.unmarshal(marshaled);
  }

  static create = <
    KeyPath extends string,
    S extends RizzleRawSchemaForKeyPath<KeyPath>,
  >(
    keyPath: KeyPath,
    shape: S,
  ): RizzleEntity<KeyPath, S> => {
    const keyPathVars = keyPathVariableNames(keyPath);
    const valueType = object(shape);

    // "aw[f]fefe[g]" -> ["aw", "fefe", ""]
    const filler: readonly string[] = keyPath.split(/\[.+?\]/);
    invariant(filler.length > 0);
    const interpolateKey = (
      keyInput: Partial<EntityKeyType<S, KeyPath>[`_input`]>,
      allowPartial = false,
    ): string => {
      let result = filler[0];
      invariant(result != null);
      for (const [i, varName] of keyPathVars.entries()) {
        if (varName in keyInput) {
          result += shape[varName].marshal(keyInput[varName]);
          const nextFiller = filler[i + 1];
          invariant(nextFiller != null);
          result += nextFiller;
        } else {
          invariant(allowPartial, `missing key variable`);
          break;
        }
      }
      return result;
    };

    return new RizzleEntity({
      keyPath,
      valueType,
      interpolateKey,
      typeName: `entity`,
    });
  };
}

interface RizzleMutatorDef<P extends RizzleRawObject> extends RizzleTypeDef {
  args: RizzleObject<P>;
  alias?: string;
  typeName: `mutator`;
}

export class RizzleMutator<P extends RizzleRawObject> extends RizzleRoot<
  RizzleMutatorDef<P>
> {
  alias(alias: string): RizzleMutator<P> {
    return new RizzleMutator({
      ...this._def,
      alias,
    });
  }

  marshalArgs(options: RizzleObjectInput<P>): RizzleObjectMarshaled<P> {
    return this._def.args.marshal(options);
  }

  static create = <P extends RizzleRawObject>(
    parameters: RizzleObject<P>,
  ): RizzleMutator<P> => {
    return new RizzleMutator({ args: parameters, typeName: `mutator` });
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RizzleAnyMutator = RizzleMutator<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RizzleAnyEntity = RizzleEntity<string, any>;

export type RizzleRawObject = Record<string, RizzleType>;

export type RizzleRawSchema = Record<string, RizzleRoot | string>;

export type RizzleObjectInput<T extends RizzleRawObject> = {
  [K in keyof T]: T[K][`_input`];
};

export type RizzleObjectMarshaled<T extends RizzleRawObject> = {
  // TODO: this is missing key aliases
  [K in keyof T]: T[K][`_marshaled`];
};

export type RizzleObjectOutput<T extends RizzleRawObject> = {
  [K in keyof T]: T[K][`_output`];
};

export type RizzleIndexNames<T extends RizzleType> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends RizzleIndexed<any, infer IndexName>
    ? IndexName
    : T extends RizzleTypeAlias<infer Wrapped>
      ? RizzleIndexNames<Wrapped>
      : T extends RizzleNullable<infer Wrapped>
        ? RizzleIndexNames<Wrapped>
        : T extends RizzleObject<infer Shape>
          ? {
              [K in keyof Shape]: RizzleIndexNames<Shape[K]>;
            }[keyof Shape]
          : never;

export type RizzleIndexTypes<T extends RizzleType> = {
  [K in RizzleIndexTypesInner<T> as K[0]]: K[1];
};

export type RizzleIndexTypesInner<T extends RizzleType> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends RizzleIndexed<any, infer IndexName>
    ? [IndexName, T[`_input`]]
    : T extends RizzleTypeAlias<infer Wrapped>
      ? RizzleIndexTypesInner<Wrapped>
      : T extends RizzleNullable<infer Wrapped>
        ? RizzleIndexTypesInner<Wrapped>
        : T extends RizzleObject<infer Shape>
          ? {
              [K in keyof Shape]: RizzleIndexTypesInner<Shape[K]>;
            }[keyof Shape]
          : never;

type WithoutFirstArgument<T> = T extends (
  arg1: never,
  ...args: infer P
) => infer R
  ? (...args: P) => R
  : never;

type WithoutFirstArgumentForObj<T> = {
  [K in keyof T as T[K] extends AnyFunction ? K : never]: WithoutFirstArgument<
    T[K]
  >;
};

export type RizzleReplicacheMutatorTx<S extends RizzleRawSchema> = {
  [K in keyof S as S[K] extends RizzleAnyEntity
    ? K
    : never]: S[K] extends RizzleAnyEntity
    ? WithoutFirstArgumentForObj<
        RizzleReplicacheEntityMutate<S[K]> & RizzleReplicacheEntityQuery<S[K]>
      >
    : never;
} & { tx: WriteTransaction };

export type RizzleReplicacheMutators<S extends RizzleRawSchema> = {
  [K in keyof S as S[K] extends RizzleMutator<infer _>
    ? K
    : never]: S[K] extends RizzleMutator<infer P>
    ? (
        tx: RizzleReplicacheMutatorTx<S>,
        options: RizzleObject<P>[`_output`],
      ) => Promise<void>
    : never;
};

export type RizzleDrizzleMutators<S extends RizzleRawSchema, Tx> = {
  [K in keyof S as S[K] extends RizzleMutator<infer _>
    ? K
    : never]: S[K] extends RizzleMutator<infer P>
    ? (
        tx: Tx,
        userId: string,
        options: RizzleObject<P>[`_output`],
      ) => Promise<void>
    : never;
};

export type RizzleReplicacheAnyMutator = (
  tx: RizzleReplicacheMutatorTx<never>,
  options: unknown,
) => Promise<void>;

export type RizzleReplicacheMutate<S extends RizzleRawSchema> = {
  [K in keyof S]: S[K] extends RizzleMutator<infer P>
    ? (options: RizzleObject<P>[`_input`]) => Promise<void>
    : never;
};

export type RizzleScanResult<T extends RizzleAnyEntity> = AsyncGenerator<
  [string, T[`_def`][`valueType`][`_output`]]
> & { toArray: () => Promise<[string, T[`_def`][`valueType`][`_output`]][]> };

export type RizzleReplicacheEntityMutate<T extends RizzleAnyEntity> =
  T extends RizzleAnyEntity ? Pick<T, `set`> : never;

export type RizzleReplicacheEntityQuery<T extends RizzleAnyEntity> =
  T extends RizzleEntity<infer KeyPath, infer Schema>
    ? {
        [K in keyof RizzleIndexTypes<T[`_def`][`valueType`]>]: (
          tx: ReadTransaction,
          indexValue?: RizzleIndexTypes<T[`_def`][`valueType`]>[K],
          /**
           * If true (default), only return values that exactly match this
           * value. When false all values gte this value are returned.
           */
          exact?: boolean,
        ) => RizzleScanResult<T>;
      } & Pick<T, `get` | `has`> & {
          scan: (
            tx: ReadTransaction,
            options?: Partial<EntityKeyType<Schema, KeyPath>[`_input`]>,
          ) => RizzleScanResult<T>;
        }
    : never;

export type RizzleReplicachePagedEntityQuery<T extends RizzleAnyEntity> =
  T extends RizzleEntity<infer KeyPath, infer Schema>
    ? {
        [K in keyof RizzleIndexTypes<T[`_def`][`valueType`]>]: (
          indexValue?: RizzleIndexTypes<T[`_def`][`valueType`]>[K],
          /**
           * If true (default), only return values that exactly match this
           * value. When false all values gte this value are returned.
           */
          exact?: boolean,
        ) => RizzleScanResult<T>;
      } & {
        scan: (
          options?: Partial<EntityKeyType<Schema, KeyPath>[`_input`]>,
        ) => RizzleScanResult<T>;
      }
    : never;

export type RizzleReplicacheQuery<S extends RizzleRawSchema> = {
  [K in keyof S as S[K] extends RizzleAnyEntity
    ? K
    : never]: S[K] extends RizzleAnyEntity
    ? RizzleReplicacheEntityQuery<S[K]>
    : never;
};

export type RizzleReplicachePagedQuery<S extends RizzleRawSchema> = {
  [K in keyof S as S[K] extends RizzleAnyEntity
    ? K
    : never]: S[K] extends RizzleAnyEntity
    ? RizzleReplicachePagedEntityQuery<S[K]>
    : never;
};

const string = (alias?: string) => {
  const result = RizzleCustom.create(z.string(), z.string());
  return alias == null ? result : result.alias(alias);
};

const number = (alias?: string) => {
  const result = RizzleCustom.create(z.number(), z.number());
  return alias == null ? result : result.alias(alias);
};

/**
 * A UNIX timestamp number.
 *
 * Be careful using this for storage (`r.entity`) because it can't be indexed
 * and if it's used in a key path it isn't a stable length so it's not
 * guaranteed to sort correctly. For storage use {@link datetime} instead.
 */
const timestamp = memoize(() =>
  RizzleCustom.create(
    z.union([z.number(), z.date().transform((x) => x.getTime())]),
    z.union([
      z
        .string()
        .refine((x) => x.endsWith(`Z`))
        .transform((x) => new Date(x)), // ISO8601
      z.number().transform((x) => new Date(x)), // timestamp
      z.coerce.number().transform((x) => new Date(x)),
    ]),
  ),
);

/**
 * Stores as ISO-8601 so that it can be indexed and sorted reliably. (numbers
 * can't be indexed in replicache).
 */
const datetime = memoize(() =>
  RizzleCustom.create(
    z.date().transform((x) => x.toISOString()),
    z
      .string()
      .refine((x) => x.endsWith(`Z`))
      .transform((x) => new Date(x)), // ISO8601
  ),
);

type EnumType = Record<string, string | number>;

const enum_ = <T extends EnumType, U extends string = string>(
  e: T,
  mapping: Record<T[keyof T], U>,
): RizzleCustom<T[keyof T], string, T[keyof T]> => {
  const marshalMap = new Map<T[keyof T], U>(
    Object.entries(mapping).map(([kStr, v]) => {
      const k = Object.entries(e).find(
        ([, value]) => value.toString() === kStr,
      )?.[1];
      invariant(
        k !== undefined,
        `couldn't find original enum value for ${kStr}`,
      );
      return [k as unknown as T[keyof T], v as U];
    }),
  );

  const unmarshalMap = mapInvert(marshalMap);

  return RizzleCustom.create(
    z.custom<T[keyof T]>().transform((x, ctx) => {
      const marshaled = marshalMap.get(x);
      if (marshaled == null) {
        return invalid(ctx, `couldn't marshal value ${x}`);
      }
      return marshaled;
    }),
    z.string().transform((x, ctx) => {
      const unmarshaled = unmarshalMap.get(x as U);
      if (unmarshaled == null) {
        return invalid(ctx, `couldn't unmarshal value for ${x}`);
      }
      return unmarshaled;
    }),
  );
};

const literal = <T extends RizzleType, const V extends T[`_input`]>(
  value: V,
  type: T,
) =>
  RizzleCustom.create<V, T[`_marshaled`], V>(
    z.literal(value).pipe(type.getMarshal()),
    type
      .getUnmarshal()
      .pipe(z.literal(value))
      .refine((x): x is V => x === value),
  );

const object = <S extends RizzleRawObject>(shape: S) => {
  return RizzleObject.create(shape);
};

const entity = <
  KeyPath extends string,
  S extends RizzleRawSchemaForKeyPath<KeyPath>,
>(
  keyPath: KeyPath,
  shape: S,
) => {
  return RizzleEntity.create(keyPath, shape);
};

const mutator = <I extends RizzleRawObject>(input: I) =>
  RizzleMutator.create(object(input));

export type RizzleReplicache<
  S extends RizzleRawSchema,
  _MutatorDefs extends MutatorDefs = MutatorDefs,
> = {
  replicache: Replicache<_MutatorDefs>;
  mutate: RizzleReplicacheMutate<S>;
  query: RizzleReplicacheQuery<S>;
  queryPaged: RizzleReplicachePagedQuery<S>;
  [Symbol.asyncDispose]: () => Promise<void>;
};

const replicache = <
  S extends { version: string; [key: string]: RizzleRoot | string },
  _MutatorDefs extends MutatorDefs = MutatorDefs,
>(
  replicacheOptions: Omit<
    ReplicacheOptions<never>,
    `indexes` | `mutators` | `schemaVersion`
  >,
  schema: S,
  mutators: RizzleReplicacheMutators<S>,
  ctor?: (options: ReplicacheOptions<MutatorDefs>) => Replicache<_MutatorDefs>,
): RizzleReplicache<S, _MutatorDefs> => {
  const indexes = Object.fromEntries(
    Object.entries(schema).flatMap(([k, v]) =>
      v instanceof RizzleEntity
        ? Object.entries(
            v.getIndexes() as Record<string, RizzleIndexDefinition<unknown>>,
            // mapKeys(v.getIndexes(), (_v, indexName) => `${k}.${indexName}`),
          ).map(([indexName, { prefix, allowEmpty, jsonPointer }]) => [
            `${k}.${indexName}`,
            // Omit `marshal` and any other properties that replicache doesn't support.
            { prefix, allowEmpty, jsonPointer },
          ])
        : [],
    ),
  );

  const entityApi = Object.fromEntries(
    Object.entries(schema).flatMap(([k, e]) =>
      e instanceof RizzleEntity
        ? [
            [
              k,
              Object.assign(
                {
                  has: e.has.bind(e),
                  get: e.get.bind(e),
                  set: e.set.bind(e),
                  // prefix scan
                  scan: (tx: ReadTransaction, partialKey = {}) =>
                    withToArray(
                      scanIter(
                        tx,
                        e._def.interpolateKey(partialKey, true),
                        (x) =>
                          e.unmarshalValue(
                            x as (typeof e)[`_def`][`valueType`][`_marshaled`],
                          ),
                      ),
                    ),
                },
                // index scans
                mapValues(
                  e.getIndexes() as Record<
                    string,
                    RizzleIndexDefinition<unknown>
                  >,
                  (_v, indexName) =>
                    (tx: ReadTransaction, value: unknown, exact = true) =>
                      withToArray(
                        indexScanIter(
                          tx,
                          `${k}.${indexName}`,
                          (x) =>
                            e.unmarshalValue(
                              x as (typeof e)[`_def`][`valueType`][`_marshaled`],
                            ),
                          value == null ? undefined : _v.marshal(value),
                          exact,
                        ),
                      ),
                ),
              ),
            ],
          ]
        : [],
    ),
  );

  const mutate = Object.fromEntries(
    Object.entries(schema).flatMap(([k, v]) =>
      v instanceof RizzleMutator
        ? [
            [
              k,
              (options: typeof v._def.args._input) => {
                const mutator = replicache.mutate[v._def.alias ?? k];
                invariant(mutator != null, `mutator ${k} not found`);
                return mutator(v._def.args.marshal(options));
              },
            ],
          ]
        : [],
    ),
  ) as RizzleReplicacheMutate<S>;

  const mutatorsWithMarshaling = Object.fromEntries(
    Object.entries(schema).flatMap(([k, v]) =>
      v instanceof RizzleMutator
        ? [
            [
              v._def.alias ?? k,
              (tx: WriteTransaction, options: typeof v._def.args._input) => {
                const mutator = mutators[k as keyof typeof mutators];
                invariant(
                  (mutator as unknown) != null,
                  `mutator ${k} not found`,
                );

                const db = Object.assign(
                  { tx },
                  mapValues(entityApi, (v) =>
                    mapValues(v, (vv) => vv.bind(vv, tx)),
                  ),
                ) as RizzleReplicacheMutatorTx<S>;

                return mutator(db, v._def.args.unmarshal(options));
              },
            ],
          ]
        : [],
    ),
  ) as unknown as MutatorDefs;

  const options = {
    ...replicacheOptions,
    schemaVersion: schema.version,
    indexes,
    mutators: mutatorsWithMarshaling as _MutatorDefs,
  };
  const replicache = ctor?.(options) ?? new Replicache(options);

  const query = entityApi as unknown as RizzleReplicacheQuery<S>;

  const entityPagedApi = Object.fromEntries(
    Object.entries(schema).flatMap(([k, e]) =>
      e instanceof RizzleEntity
        ? [
            [
              k,
              Object.assign(
                {
                  // prefix scan
                  scan: (partialKey = {}) =>
                    withToArray(
                      scanPagedIter(
                        (fn) => replicache.query(fn),
                        e._def.interpolateKey(partialKey, true),
                        (x) =>
                          e.unmarshalValue(
                            x as (typeof e)[`_def`][`valueType`][`_marshaled`],
                          ),
                      ),
                    ),
                },
                // paged index scans
                mapValues(
                  e.getIndexes() as Record<
                    string,
                    RizzleIndexDefinition<unknown>
                  >,
                  (_v, indexName) =>
                    (indexValue?: unknown, exact = true) =>
                      withToArray(
                        indexScanPagedIter(
                          (fn) => replicache.query(fn),
                          `${k}.${indexName}`,
                          (x) =>
                            e.unmarshalValue(
                              x as (typeof e)[`_def`][`valueType`][`_marshaled`],
                            ),
                          indexValue == null
                            ? undefined
                            : _v.marshal(indexValue),
                          exact,
                        ),
                      ),
                ),
              ),
            ],
          ]
        : [],
    ),
  );

  const queryPaged = entityPagedApi as unknown as RizzleReplicachePagedQuery<S>;

  return {
    replicache,
    query,
    queryPaged,
    mutate,
    [Symbol.asyncDispose]: () => replicache.close(),
  };
};

export const replicacheMutationSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    args: z.unknown(),
    timestamp: z.number(),
    clientId: z.string(),
  })
  .strict();

export type ReplicacheMutation = z.infer<typeof replicacheMutationSchema>;

export const cookieSchema = z
  .object({
    order: z.number(),
    cvrId: z.string(),
  })
  .nullable();

export type Cookie = z.infer<typeof cookieSchema>;

export const clientStateNotFoundSchema = z.object({
  error: z.literal(`ClientStateNotFound`),
});

export type ClientStateNotFoundResponse = z.infer<
  typeof clientStateNotFoundSchema
>;

export const versionNotSupportedResponseSchema = z
  .object({
    error: z.literal(`VersionNotSupported`),
    versionType: z.union([
      z.literal(`pull`),
      z.literal(`push`),
      z.literal(`schema`),
    ]),
  })
  .partial({ versionType: true });

export type VersionNotSupportedResponse = z.infer<
  typeof versionNotSupportedResponseSchema
>;

export const pushRequestSchema = z
  .object({
    profileId: z.string(),
    clientGroupId: z.string(),
    pushVersion: z.number(),
    schemaVersion: z.string(),
    mutations: z.array(replicacheMutationSchema),
  })
  .strict();

export type PushRequest = z.infer<typeof pushRequestSchema>;

export const pushResponseSchema = z
  .union([clientStateNotFoundSchema, versionNotSupportedResponseSchema])
  .optional();

export type PushResponse = z.infer<typeof pushResponseSchema>;

export const pullRequestSchema = z
  .object({
    pullVersion: z.literal(1),
    clientGroupId: z.string(),
    cookie: cookieSchema.nullable(),
    profileId: z.string(),
    schemaVersion: z.string(),
  })
  .strict();

export type PullRequest = z.infer<typeof pullRequestSchema>;

export const pullOkResponseSchema = z.object({
  cookie: cookieSchema,
  lastMutationIdChanges: z.record(z.number()),
  patch: z.array(
    z.discriminatedUnion(`op`, [
      z.object({
        op: z.literal(`put`),
        key: z.string(),
        value: z.union([
          z.null(),
          z.string(),
          z.boolean(),
          z.number(),
          z.array(z.unknown()),
          z.record(z.unknown()),
        ]),
      }),
      z.object({
        op: z.literal(`del`),
        key: z.string(),
      }),
      z.object({
        op: z.literal(`clear`),
      }),
    ]),
  ),
});

export type PullOkResponse = z.infer<typeof pullOkResponseSchema>;

export const pullResponseSchema = z.union([
  clientStateNotFoundSchema,
  versionNotSupportedResponseSchema,
  pullOkResponseSchema,
]);

export type PullResponse = z.infer<typeof pullResponseSchema>;

export type MutateHandler<Tx> = (
  tx: Tx,
  userId: string,
  mutation: ReplicacheMutation,
) => Promise<void>;

export const makeDrizzleMutationHandler = <S extends RizzleRawSchema, Tx>(
  schema: S,
  mutators: RizzleDrizzleMutators<S, Tx>,
): MutateHandler<Tx> => {
  const handlersWithUnmarshaling = Object.fromEntries(
    Object.entries(schema).flatMap(([k, v]) =>
      v instanceof RizzleMutator
        ? [
            [
              v._def.alias ?? k,
              (tx: Tx, userId: string, mutation: ReplicacheMutation) => {
                const mutator =
                  k in mutators ? mutators[k as keyof typeof mutators] : null;
                invariant(mutator != null, `mutator ${k} not found`);

                return mutator(
                  tx,
                  userId,
                  v._def.args.unmarshal(
                    mutation.args as typeof v._def.args._marshaled,
                  ),
                );
              },
            ],
          ]
        : [],
    ),
  );

  return async (
    tx: Tx,
    userId: string,
    mutation: ReplicacheMutation,
  ): Promise<void> => {
    const mutator = handlersWithUnmarshaling[mutation.name];
    invariant(mutator != null);
    await mutator(tx, userId, mutation);
  };
};

export const r = {
  string,
  number,
  timestamp,
  datetime,
  enum: enum_,
  object,
  entity,
  mutator,
  custom: RizzleCustom.create,
  replicache,
  literal,
};

export function invalid(ctx: z.RefinementCtx, message: string): typeof z.NEVER {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message,
  });
  return z.NEVER;
}

export type ExtractVariableNames<T extends string> =
  T extends `${string}[${infer Key}]${infer Rest}`
    ? Key | ExtractVariableNames<Rest>
    : never;

export const keyPathVariableNames = <T extends string>(
  key: T,
): ExtractVariableNames<T>[] => {
  return (
    key
      .match(/\[(.+?)\]/g)
      ?.map((key) => key.slice(1, -1) as ExtractVariableNames<T>) ?? []
  );
};

type IndexModeStartKey = [secondaryKey: string, primaryKey: string | undefined];

async function* indexScanIter<V>(
  tx: ReadTransaction,
  indexName: string,
  unmarshalValue: (v: unknown) => V,
  startKey?: string | IndexModeStartKey,
  endAfterStartKey?: boolean,
): AsyncGenerator<[key: string, value: V, secondaryKey: string]> {
  if (typeof startKey === `string`) {
    // key must be passed an as array because we've passed
    // `indexName`, check the replicache docs for details.
    startKey = [startKey, undefined];
  }
  try {
    for await (const [[secondaryKey, key], value] of tx
      .scan({
        indexName,
        start:
          startKey == null
            ? undefined
            : {
                key: startKey,
                exclusive: startKey[1] != null,
              },
      })
      .entries()) {
      if (
        startKey != null &&
        endAfterStartKey === true &&
        secondaryKey !== startKey[0]
      ) {
        break;
      }
      yield [key, unmarshalValue(value), secondaryKey];
    }
  } catch (error) {
    diagnoseError(error);
    throw error;
  }
}

/**
 * A utility to yield to the event loop every `timeoutMs` milliseconds. This
 * helps keep the UI responsive by spreading expensive tasks over multiple main
 * loop ticks.
 *
 * The returned function needs to be called in a loop to be effective.
 *
 * @param timeoutMs
 * @returns
 */
function eventLoopThrottle(timeoutMs: number) {
  let deadline: number | undefined;
  return async () => {
    if (deadline != null && performance.now() > deadline) {
      deadline = undefined;
    }
    if (deadline == null) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      deadline ??= performance.now() + timeoutMs;
    }
  };
}

// Enforce a fixed budget for paged scans, this leaves time for everything else
// that needs to run within 16 ms in a frame to achieve 60 fps.
const scanPagedIterThrottle = eventLoopThrottle(4);

/**
 * Scan over an index in a paged manner. Each page uses a separate transaction
 * so it's safe to do expensive things while looping over the results without it
 * holding open a transaction for too long and risk having it prematurely close.
 */
export async function* indexScanPagedIter<Value>(
  query: <R>(body: (tx: ReadTransaction) => R) => Promise<R>,
  indexName: string,
  unmarshalValue: (v: unknown) => Value,
  startKey?: string,
  endAfterStartKey?: boolean,
): AsyncGenerator<readonly [key: string, value: Value, indexKey: string]> {
  if (startKey == null) {
    endAfterStartKey = undefined;
  }
  const pageSize = 50;
  type Item = readonly [key: string, value: Value, indexKey: string];
  let page: Item[];

  let indexStartKey: IndexModeStartKey | undefined =
    startKey == null ? undefined : [startKey, undefined];

  do {
    await scanPagedIterThrottle();
    try {
      page = [];
      await query(async (tx) => {
        for await (const item of indexScanIter(
          tx,
          indexName,
          unmarshalValue,
          indexStartKey,
          endAfterStartKey,
        )) {
          page.push(item);
          indexStartKey = [item[2], item[0]];
          if (page.length === pageSize) {
            break;
          }
        }
      });
    } catch (error) {
      diagnoseError(error);
      throw error;
    }
    for (const entry of page) {
      await scanPagedIterThrottle();
      yield entry;
    }
  } while (page.length > 0);
}

/**
 * Helper to convert an async generator to an array (until Array.fromAsync is
 * available in hermes).
 * @param iter @returns
 */
function withToArray<T>(
  iter: AsyncGenerator<T>,
): AsyncGenerator<T> & { toArray: () => Promise<T[]> } {
  return Object.assign(iter, { toArray: () => fromAsync(iter) });
}

export async function* scanIter<Value>(
  tx: ReadTransaction,
  prefix: string,
  unmarshalValue: (v: unknown) => Value,
  startKey?: string,
): AsyncGenerator<[key: string, value: Value]> {
  try {
    for await (const [key, value] of tx
      .scan({
        prefix,
        start:
          startKey == null ? undefined : { key: startKey, exclusive: true },
      })
      .entries()) {
      yield [key, unmarshalValue(value)] as const;
    }
  } catch (error) {
    diagnoseError(error);
    throw error;
  }
}

export async function* scanPagedIter<V>(
  query: <R>(body: (tx: ReadTransaction) => R) => Promise<R>,
  prefix: string,
  unmarshalValue: (v: unknown) => V,
  startKey?: string,
): AsyncGenerator<[key: string, value: V]> {
  type Item = [key: string, value: V];
  const pageSize = 50;

  let page: Item[];
  do {
    await scanPagedIterThrottle();
    try {
      page = [];
      await query(async (tx) => {
        for await (const item of scanIter(
          tx,
          prefix,
          unmarshalValue,
          startKey,
        )) {
          page.push(item);
          startKey = item[0];
          if (page.length === pageSize) {
            break;
          }
        }
      });
    } catch (error) {
      diagnoseError(error);
      throw error;
    }
    for (const item of page) {
      await scanPagedIterThrottle();
      yield item;
    }
  } while (page.length > 0);
}

function diagnoseError(e: unknown): void {
  if (isUseAfterTransactionFinishedError(e)) {
    console.error(
      `Attempted to use replicache's IDB transaction after it finished. This can happen when a transaction is idle for a whole event loop tick. This can be due to \`await\`-ing a fetch() or other async operation that isn't queued as a microtask. To fix it await the slow promise outside the transaction.`,
    );
  }
}

function isUseAfterTransactionFinishedError(e: unknown): e is DOMException {
  return (
    e instanceof DOMException &&
    e.name === `InvalidStateError` &&
    e.message.includes(`The transaction finished.`)
  );
}
