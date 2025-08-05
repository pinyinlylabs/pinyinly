import type React from "react";
import type { Prettify } from "ts-essentials";

export type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

/**
 * react-query strictly forbids returning `undefined`, but this isn't enforced
 * by its types. This type is used to enforce that rule.
 */
export type ReactQueryValue = object | string | null | unknown[] | number;

type MaximumAllowedBoundary = 50;

// See https://stackoverflow.com/a/69787886
export type RepeatedSequence<
  Tuple extends unknown[],
  Result extends unknown[] = [],
  Count extends readonly number[] = [],
> = Count[`length`] extends MaximumAllowedBoundary
  ? Result
  : Tuple extends []
    ? []
    : Result extends []
      ? RepeatedSequence<Tuple, Tuple, [...Count, 1]>
      : RepeatedSequence<Tuple, Result | [...Result, ...Tuple], [...Count, 1]>;

export type ValuesOf<X> = X[keyof X];

// This is used to make more helpful type errors, by showing a preview of the
// mismatch type in the error. But it's critical that it doesn't accidentally
// make the type compatible with another type, so using a unique symbol
// essentially "brands" the type.
const debug = Symbol(`debug`);

// Utility type to check if two types are identical
export type IsEqual<T, U> =
  (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2
    ? true
    : false | { [debug]: Prettify<T> };

/**
 * Utility to help in asserting that all properties are destructurd from a type.
 *
 * @example
 * const { foo, bar, ...rest } = someObject;
 * true satisfies IsExhaustedRest<typeof rest>;
 */
export type IsExhaustedRest<T> = IsEqual<T, Record<never, never>>;

export type Flatten<T> = {
  [k in keyof T]: T[k];
};

export type PartialIfUndefined<T> = Flatten<
  {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
  } & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  }
>;

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(() => {
  // @ts-expect-error Array.fromAsync isn't available in hermes, so the TypeScript
  // `lib` for it should not be included.
  //
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  Array.fromAsync();
});

export class UnexpectedValueError extends Error {
  constructor(
    // Type enables type checking
    value: never,
    // Avoid exception if `value` is:
    // - object without prototype
    // - symbol
    message = `Unexpected value: ${Object.prototype.toString.call(value)}`,
  ) {
    super(message);
  }
}

export type PropertyValues<Obj> = Obj[Exclude<keyof Obj, `__proto__`>];
