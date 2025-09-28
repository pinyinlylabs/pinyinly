import { LRUCache } from "lru-cache";
import type { DeepReadonly } from "ts-essentials";
import { invariant } from "./invariant.ts";

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
  if (map.get(key) === value) {
    return map;
  }
  const copy = new Map(map);
  copy.set(key, value);
  return copy;
}

export function readonlyMapDelete<K, V>(
  map: ReadonlyMap<K, V>,
  key: K,
): ReadonlyMap<K, V> {
  if (!map.has(key)) {
    return map;
  }
  const copy = new Map(map);
  copy.delete(key);
  return copy;
}

export function mutableArrayFilter<X>(arr: X[], predicate: (x: X) => boolean) {
  let writeIndex = 0;
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let readIndex = 0; readIndex < arr.length; readIndex++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const item = arr[readIndex]!;
    if (predicate(item)) {
      arr[writeIndex] = item;
      writeIndex++;
    }
  }
  arr.length = writeIndex;
}

export function objectMap<K extends string, V, K2 extends string, V2>(
  object: Partial<Record<K, V>>,
  mapFn: (key: K, value: V) => [K2, V2],
): Record<K2, V2> {
  return Object.fromEntries(
    // Use Object.keys() instead of Object.entries() to avoid allocating an
    // array for every item.
    Object.keys(object).map((k) => mapFn(k as K, object[k as K] as V)),
  ) as Record<K2, V2>;
}

export function objectMapToArray<K extends string, V, V2>(
  object: Partial<Record<K, V>>,
  mapFn: (key: K, value: V) => V2,
): V2[] {
  return Object.keys(object).map((k) => mapFn(k as K, object[k as K] as V));
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
export function merge<T>(a: T, b: T): T {
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

/**
 * Memoize a function that takes a single argument.
 *
 * The cache is a Map that is never cleared, so only use this for functions with
 * bounded input.
 */
export function memoize1<
  R,
  Fn extends (input: never) => R,
  T extends Parameters<Fn>[0],
>(fn: Fn): Fn & { isCached: (input: T) => boolean } {
  const cache = new Map<T, R>();
  const memoFn = function <This>(this: This, input: T) {
    if (cache.has(input)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache.get(input)!;
    }
    const ret = fn.call(this, input);
    cache.set(input, ret);
    return ret;
  } as Fn;
  Object.defineProperty(memoFn, `name`, { value: fn.name });
  return Object.assign(memoFn, {
    isCached: (input: T) => cache.has(input),
  });
}

/**
 * LRU based caching for a single-argument function.
 *
 * See https://github.com/isaacs/node-lru-cache for docs.
 */
export function lruMemoize1<
  R extends NonNullable<unknown>,
  T extends NonNullable<unknown>,
>(
  fn: (input: T) => R,
  cacheOptions: LRUCache.Options<T, R, unknown>,
): typeof fn {
  const cache = new LRUCache(cacheOptions);
  const memoFn = function <This>(this: This, input: T) {
    const cached = cache.get(input);
    if (cached != null) {
      return cached;
    }
    const computed = fn.call(this, input);
    cache.set(input, computed);
    return computed;
  } as typeof fn;
  Object.defineProperty(memoFn, `name`, { value: fn.name });
  return memoFn;
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

export class MinHeap<T> {
  #items: T[] = [];
  #comparator: (a: T, b: T) => number;
  #capacity: number;

  constructor(comparator: (a: T, b: T) => number, capacity: number) {
    this.#comparator = comparator;
    this.#capacity = capacity;
  }

  insert(item: T) {
    if (this.#items.length < this.#capacity) {
      this.#items.push(item);
      this.#bubbleUp(this.#items.length - 1);
    } else if (
      this.#items.length > 0 &&
      this.#comparator(item, this.#items[0] as T) > 0
    ) {
      this.#items[0] = item;
      this.#bubbleDown(0);
    }
  }

  toArray(): T[] {
    return [...this.#items].sort(this.#comparator);
  }

  #bubbleUp(index: number) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const curr = this.#items[index] as T;
      const parent = this.#items[parentIndex] as T;
      if (this.#comparator(curr, parent) >= 0) {
        break;
      }
      [this.#items[index], this.#items[parentIndex]] = [
        this.#items[parentIndex] as T,
        this.#items[index] as T,
      ];
      index = parentIndex;
    }
  }

  #bubbleDown(index: number) {
    const length = this.#items.length;
    let next: number;
    do {
      next = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (
        left < length &&
        this.#comparator(this.#items[left] as T, this.#items[next] as T) < 0
      ) {
        next = left;
      }
      if (
        right < length &&
        this.#comparator(this.#items[right] as T, this.#items[next] as T) < 0
      ) {
        next = right;
      }

      if (next !== index) {
        [this.#items[index], this.#items[next]] = [
          this.#items[next] as T,
          this.#items[index] as T,
        ];
        index = next;
      }
    } while (next !== index);
  }
}

export function* topK<T>(
  source: T[],
  capacity: number,
  cmp: SortComparator<T>,
) {
  if (capacity === 0) {
    return;
  }

  const heap = new MinHeap<T>(cmp, capacity);
  for (const item of source) {
    heap.insert(item);
  }
  for (const item of heap.toArray()) {
    yield item;
  }
}
