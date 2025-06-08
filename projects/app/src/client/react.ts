import type { Ref } from "react";

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): Ref<T> {
  return (value) => {
    const cleanups: (() => void)[] = [];

    for (const ref of refs) {
      if (typeof ref === `function`) {
        const cleanup = ref(value);
        if (typeof cleanup === `function`) {
          cleanups.push(cleanup);
        } else {
          cleanups.push(() => ref(null));
        }
      } else if (ref) {
        ref.current = value;
        cleanups.push(() => (ref.current = null));
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };
}
