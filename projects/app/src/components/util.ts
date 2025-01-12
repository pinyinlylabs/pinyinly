import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useInsertionEffect, useRef } from "react";
import { Platform } from "react-native";

export function hapticImpactIfMobile() {
  if (Platform.OS === `ios` || Platform.OS === `android`) {
    // Calling impactAsync on an unsupported platform (e.g. web) throws an
    // exception and will crash the app.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      (e: unknown) => {
        console.error(e);
      },
    );
  }
}

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

function useRenderGuardImpl(debugName: string) {
  const renders = useRef(0);
  const lastCheck = useRef(Date.now());

  useEffect(() => {
    renders.current += 1;
    const now = Date.now();
    const elapsed = now - lastCheck.current;

    // Check every 5 seconds
    if (elapsed >= 5000) {
      // Error if there were more than 25 re-renders.
      if (renders.current > 25) {
        throw new Error(
          `${useRenderGuardImpl.name}(${debugName}) re-rendered ${renders.current} times in ${elapsed} ms`,
        );
      }
      renders.current = 0;
      lastCheck.current = now;
    }
  });
}

/**
 * A hook that monitors the number of re-renders occurs and throws an error if
 * too many happened. This makes it very obvious when there are re-rendering
 * bugs and makes tracking them down much simpler.
 *
 * Only runs in dev mode.
 */
export const useRenderGuard = __DEV__ ? useRenderGuardImpl : null;
