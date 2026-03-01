import { useLayoutEffect, useRef } from "react";
import type { TextInput } from "react-native";

/**
 * Fixes auto-focus behaviour on Safari.
 *
 * Returns a ref that can be merged with other refs using `mergeRefs`.
 */
export function useAutoFocusRef(autoFocus?: boolean) {
  const inputRef = useRef<TextInput>(null);

  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (autoFocus === true) {
      timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }

    return () => {
      if (timer != null) {
        clearTimeout(timer);
      }
    };
  }, [autoFocus]);

  return inputRef;
}
