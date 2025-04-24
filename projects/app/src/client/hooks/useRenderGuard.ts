import { useEffect, useRef } from "react";

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

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};

/**
 * A hook that monitors the number of re-renders occurs and throws an error if
 * too many happened. This makes it very obvious when there are re-rendering
 * bugs and makes tracking them down much simpler.
 *
 * Only runs in dev mode.
 */
export const useRenderGuard = __DEV__ ? useRenderGuardImpl : () => noOp;
