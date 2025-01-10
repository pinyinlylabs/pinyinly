import type { PropsOf } from "@/components/types";
import type { TypedNavigator } from "@react-navigation/native";
import type { AnyFunction, Prettify } from "ts-essentials";

type MaximumAllowedBoundary = 50;

// See https://stackoverflow.com/a/69787886
export type RepeatedSequence2<
  Tuple extends unknown[],
  Result extends unknown[] = [],
  Count extends readonly number[] = [],
> = Count[`length`] extends MaximumAllowedBoundary
  ? Result
  : Tuple extends []
    ? []
    : Result extends []
      ? RepeatedSequence2<Tuple, Tuple, [...Count, 1]>
      : RepeatedSequence2<Tuple, Result | [...Result, ...Tuple], [...Count, 1]>;

export type ValuesOf<X> = X[keyof X];

export type StackNavigationFor<
  Stack,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScreenListenersFn = Stack extends TypedNavigator<any, any>
    ? PropsOf<Stack[`Navigator`]>[`screenListeners`]
    : never,
> = ScreenListenersFn extends AnyFunction
  ? Parameters<ScreenListenersFn>[0][`navigation`]
  : never;

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
