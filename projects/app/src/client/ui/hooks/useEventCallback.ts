import { useCallback, useInsertionEffect, useRef } from "react";

type VoidFunction = (...args: never[]) => void;

/**
 * Similar to `useCallback` but offers better memoization for event handlers.
 *
 * Differences from `useCallback`:
 *
 * - The returned function is a stable reference, and will always be the same
 *   between renders.
 * - There is no dependency array.
 * - Properties or state accessed within the callback will always be "current"
 *   (good enough for event handlers anyway).
 */
export function useEventCallback<TCallback extends VoidFunction>(
  callback: TCallback,
): TCallback {
  // Keep track of the latest callback
  const latestRef = useRef(shouldNotBeInvokedBeforeMount as TCallback);

  useInsertionEffect(() => {
    latestRef.current = callback;
  }, [callback]);

  // @ts-expect-error: it's fine
  return useCallback((...args) => {
    // Avoid `this` referring to the ref when invoking the function.
    latestRef.current.apply(undefined, args);
  }, []);
}

function shouldNotBeInvokedBeforeMount() {
  throw new Error(
    `invoking useEvent before mounting violates the rules of React`,
  );
}
