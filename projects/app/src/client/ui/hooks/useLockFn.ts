import { useRef, useCallback } from "react";

// oxlint-disable-next-line typescript/no-explicit-any
export function useLockFn<P extends any[] = any[], V = any>(
  fn: (...args: P) => V,
) {
  const lockRef = useRef(false);

  return useCallback(
    async (...args: P): Promise<Awaited<V> | undefined> => {
      if (lockRef.current) {
        return;
      }
      lockRef.current = true;
      try {
        return await fn(...args);
      } finally {
        lockRef.current = false;
      }
    },
    [fn],
  );
}
