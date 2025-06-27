import type { DeviceStoreToggleableEntity } from "@/client/deviceStore";
import { deviceStoreGet } from "@/client/deviceStore";
import type { SkipToken } from "@tanstack/react-query";
import type { AnyFunction } from "ts-essentials";
import { r } from "./rizzle";

const cacheSymbol = Symbol(`slowQueryFn`);

// Define a type that allows us to store the wrapped function on the original function
type FunctionWithCache<T extends AnyFunction> = T & {
  [cacheSymbol]?: T;
};

export function devtoolsQueryFn<Fn extends AnyFunction>(
  fn: Fn | SkipToken | undefined,
): typeof fn {
  if (typeof fn === `function`) {
    const typedFn = fn as FunctionWithCache<Fn>;

    // Check if the function is already wrapped with a cache
    if (cacheSymbol in typedFn && typedFn[cacheSymbol]) {
      return typedFn[cacheSymbol];
    }

    // Create the wrapped function
    const wrappedFn = (async (...args: Parameters<Fn>) => {
      await devToolsSlowQuerySleepIfEnabled();

      return fn(...args);
    }) as Fn;

    // Cache the wrapped function on the original function
    typedFn[cacheSymbol] = wrappedFn;

    return wrappedFn;
  }

  // Return SkipToken or undefined.
  return fn;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function devToolsSlowQuerySleepIfEnabled(): Promise<void> {
  const setting = await deviceStoreGet(slowQueriesSetting);
  if (setting?.enabled ?? false) {
    await sleep(1000);
  }
}

export const slowQueriesSetting = r.entity(`settings.developer.slowQueries`, {
  enabled: r.boolean(`e`),
}) satisfies DeviceStoreToggleableEntity;
