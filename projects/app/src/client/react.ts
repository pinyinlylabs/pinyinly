import type { Ref } from "react";
import type { View } from "react-native";
import { Platform } from "react-native";

export function focusVisible(view: View) {
  // Bizarre trick to induce :focus-visible styling https://stackoverflow.com/questions/69281522/apply-focus-visible-when-focusing-element-programatically
  const isDom = Platform.OS === `web` && view instanceof HTMLElement;
  if (isDom) {
    view.contentEditable = `true`;
  }
  view.focus();
  if (isDom) {
    view.contentEditable = `false`;
  }
}

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
