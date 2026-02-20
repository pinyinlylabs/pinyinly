import { useEffect, useRef, useState } from "react";

function useRenderGuardImpl(debugName: string) {
  const renders = useRef(0);
  const [startTime] = useState(() => Date.now());
  const lastCheck = useRef(startTime);

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

// oxlint-disable-next-line no-empty-function
const noOp = () => {};

/**
 * A hook that monitors the number of re-renders occurs and throws an error if
 * too many happened. This makes it very obvious when there are re-rendering
 * bugs and makes tracking them down much simpler.
 *
 * Only runs in dev mode.
 *
 * NOTE: this won't detect re-renders caused by Suspense because these don't run
 * effects.
 */
export const useRenderGuard = __DEV__ ? useRenderGuardImpl : () => noOp;
