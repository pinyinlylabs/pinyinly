import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";
import type { TextInput } from "react-native";
import { Platform } from "react-native";

type UseAutoFocusRef = (
  autoFocus: boolean | undefined,
) => RefObject<TextInput | null>;

/**
 * Fixes auto-focus behaviour on Safari.
 *
 * Returns a ref that can be merged with other refs using `mergeRefs`.
 */
const useAutoFocusRefWeb: UseAutoFocusRef = (autoFocus) => {
  const inputRef = useRef<TextInput>(null);

  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const retryInterval = 100;
    const expiration = Date.now() + 5000;

    function focusOrRetry() {
      if (inputRef.current == null) {
        schedule();
      } else {
        inputRef.current.focus();
      }
    }

    function schedule() {
      if (Date.now() < expiration) {
        // Retry focusing for up to 5 seconds, in case the input isn't mounted yet.
        timer = setTimeout(focusOrRetry, retryInterval);
      }
    }

    if (autoFocus === true) {
      schedule();
    }

    return () => {
      if (timer != null) {
        clearTimeout(timer);
      }
    };
  }, [autoFocus]);

  return inputRef;
};

const useAutoFocusRefNoOp: UseAutoFocusRef = () => {
  const inputRef = useRef<TextInput>(null);
  return inputRef;
};

export const useAutoFocusRef: UseAutoFocusRef = Platform.select({
  web: useAutoFocusRefWeb,
  default: useAutoFocusRefNoOp,
});
