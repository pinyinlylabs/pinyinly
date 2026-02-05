declare module "array-from-async" {
  function exprt<T>(
    iterableOrArrayLike:
      | AsyncIterable<T>
      | Iterable<T | PromiseLike<T>>
      | ArrayLike<T | PromiseLike<T>>,
  ): Promise<T[]>;
  function exprt<T, U>(
    iterableOrArrayLike: AsyncIterable<T> | Iterable<T> | ArrayLike<T>,
    mapFn: (value: Awaited<T>, index: number) => U,
    thisArg?: any,
  ): Promise<Awaited<U>[]>;
  export = exprt;
}
