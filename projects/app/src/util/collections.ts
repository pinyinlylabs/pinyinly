import { invariant } from "@haohaohow/lib/invariant";
import type { DeepReadonly } from "ts-essentials";

export const deepReadonly = <T>(value: T) => value as DeepReadonly<T>;

export async function iterTake<T>(
  iter: AsyncIterableIterator<T>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  for await (const x of iter) {
    results.push(x);
    if (results.length === limit) {
      break;
    }
  }
  return results;
}

export function arrayFilterUniqueWithKey<T>(
  keyFn: (x: T) => unknown = (x) => x,
): (item: T) => boolean {
  const seen = new Set();
  return (x): boolean => {
    const key = keyFn(x);
    const unseen = !seen.has(key);
    if (unseen) {
      seen.add(key);
    }
    return unseen;
  };
}

export function readonlyMapSet<K, V>(
  map: ReadonlyMap<K, V>,
  key: K,
  value: V,
): ReadonlyMap<K, V> {
  const copy = new Map(map);
  copy.set(key, value);
  return copy;
}

export function objectInvert<K extends PropertyKey, V extends PropertyKey>(
  obj: Record<K, V>,
): Record<V, K> {
  const result: Partial<Record<V, K>> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      result[value] = key;
    }
  }
  return result as Record<V, K>;
}

export function mapInvert<K, V>(map: ReadonlyMap<K, V>): Map<V, K> {
  const result = new Map<V, K>();
  for (const [k, v] of map) {
    result.set(v, k);
  }
  return result;
}

export function mergeMaps<K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>,
): Map<K, V> {
  const result = new Map(a);
  for (const [k, v] of b) {
    result.set(k, v);
  }
  return result;
}

// a merge function that can recursively merge objects
export function merge<T>(a: T, b: T): unknown {
  if (a == null || b == null) {
    return a ?? b;
  } else if (a instanceof Map) {
    invariant(b instanceof Map);
    return new Map(
      [...a.keys(), ...b.keys()].map((key) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const aVal = a.get(key);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const bVal = b.get(key);
        return [key, merge(aVal, bVal)] as const;
      }),
    ) as T;
  } else if (Array.isArray(a)) {
    invariant(Array.isArray(b));
    return [...a, ...b] as T;
  } else if (typeof a === `object`) {
    return {
      ...a,
      ...b,
    };
  }
  return b;
}

export function deepTransform(
  x: unknown,
  transform: (x: unknown) => unknown,
): unknown {
  if (x instanceof Map) {
    return transform(
      new Map(
        [...x.entries()].map(([k, v]) => [k, deepTransform(v, transform)]),
      ),
    );
  } else if (Array.isArray(x)) {
    return transform(x.map((y) => deepTransform(y, transform)));
  }
  return transform(x);
}

export function randomOne<T>(items: readonly T[]): T {
  invariant(
    items.length > 0,
    `cannot pick one random item from an empty array`,
  );
  return items[Math.floor(Math.random() * items.length)] as T;
}

export type SortComparator<T> = NonNullable<Parameters<T[][`sort`]>[0]>;

export function sortComparatorNumber(): (a: number, b: number) => number;
export function sortComparatorNumber(): (fn: (x: unknown) => number) => number;
export function sortComparatorNumber<T>(
  fn: (x: T) => number,
): SortComparator<T>;
export function sortComparatorNumber<T>(
  fn?: (x: T) => number,
): SortComparator<T> {
  fn ??= (x) => x as unknown as number;
  return (a, b) => fn(a) - fn(b);
}

export function sortComparatorString(): (a: string, b: string) => number;
export function sortComparatorString<T>(
  fn: (x: T) => string,
): SortComparator<T>;
export function sortComparatorString<T>(
  fn?: (x: T) => string,
): SortComparator<T> {
  fn ??= (x) => x as unknown as string;
  return (a, b) => fn(a).localeCompare(fn(b));
}

export function sortComparatorDate(): (a: Date, b: Date) => number;
export function sortComparatorDate<T>(fn: (x: T) => Date): SortComparator<T>;
export function sortComparatorDate<T>(fn?: (x: T) => Date): SortComparator<T> {
  fn ??= (x) => x as unknown as Date;
  return (aInput, bInput) => {
    const a = fn(aInput);
    const b = fn(bInput);
    return a > b ? 1 : a < b ? -1 : 0;
  };
}

export function mergeSortComparators<T>(
  ...comparators: SortComparator<T>[]
): SortComparator<T> {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result != 0) {
        return result;
      }
    }
    return 0;
  };
}

export function inverseSortComparator<T>(
  comparator: SortComparator<T>,
): SortComparator<T> {
  return (a, b) => {
    const result = comparator(a, b);
    if (result != 0) {
      return -1 * result;
    }
    return 0;
  };
}

export function addRefCount<K extends object>(map: WeakMap<K, number>, key: K) {
  const newCount = (map.get(key) ?? 0) + 1;
  map.set(key, newCount);
  return newCount;
}

export function weakMemoize1<T, R>(fn: (input: T) => R): typeof fn {
  const cache = new WeakMap<object, R>();

  const memoFn = function <This>(this: This, input: T) {
    if (typeof input !== `object` || input == null) {
      return fn.call(this, input);
    }

    if (cache.has(input)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache.get(input)!;
    }
    const ret = fn.call(this, input);
    cache.set(input, ret);
    return ret;
  };
  Object.defineProperty(memoFn, `name`, { value: fn.name });
  return memoFn;
}

export function memoize0<R>(
  fn: () => R,
): (() => R) & { isCached: () => boolean } {
  let cache: R | undefined;
  let cacheSet = false;
  const memoFn = function <This>(this: This) {
    if (cacheSet) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache!;
    }
    cache = fn.call(this);
    cacheSet = true;
    return cache;
  };
  Object.defineProperty(memoFn, `name`, { value: fn.name });
  return Object.assign(memoFn, { isCached: () => cacheSet });
}

export function memoize1<T extends string, R>(
  fn: (input: T) => R,
): ((input: T) => R) & { isCached: (input: T) => boolean } {
  const cache = new Map<T, R>();
  const memoFn = function <This>(this: This, input: T) {
    if (cache.has(input)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache.get(input)!;
    }
    const ret = fn.call(this, input);
    cache.set(input, ret);
    return ret;
  };
  Object.defineProperty(memoFn, `name`, { value: fn.name });
  return Object.assign(memoFn, {
    isCached: (input: T) => cache.has(input),
  });
}

/**
 * Add a value to a set in a map without having to check if the set exists.
 */
export function mapSetAdd<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
  const items = map.get(key) ?? new Set();
  items.add(value);
  if (items.size === 1) {
    map.set(key, items);
  }
}

/**
 * Add a value to a set in a map without having to check if the set exists.
 */
export function mapArrayAdd<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const items = map.get(key) ?? [];
  items.push(value);
  if (items.length === 1) {
    map.set(key, items);
  }
}

/**
 * Split an array in half.
 */
export function evenHalve<T>(items: T[]): [T[], T[]] {
  const splitIndex = Math.floor(items.length / 2);
  const a = items.slice(0, splitIndex);
  const b = items.slice(splitIndex, splitIndex + a.length);
  return [a, b];
}

export const emptySet: ReadonlySet<never> = new Set();
export const emptyArray: readonly never[] = [];

export const makeRange = (start: number, end: number) => {
  const range = [];
  if (start <= end) {
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
  } else {
    for (let i = start; i >= end; i--) {
      range.push(i);
    }
  }
  return range;
};
