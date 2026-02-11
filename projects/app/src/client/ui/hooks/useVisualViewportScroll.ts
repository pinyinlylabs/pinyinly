import { useSyncExternalStore } from "react";

export interface VisualViewportScroll {
  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetTop} */
  offsetTop: number;
  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/offsetLeft} */
  offsetLeft: number;
}

/**
 * A hook that returns the size of the visual viewport
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport} when
 * it changes size (e.g. due to on-screen keyboard appearing).
 */
export function useVisualViewportScroll(): VisualViewportScroll | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}

const subscribe = (onStoreChange: () => void) => {
  // Because this hook is specifically only for getting the scroll of the
  // viewport we only need to listen to the `scroll` event and not the
  // `resize` event.
  globalThis.visualViewport?.addEventListener(`scroll`, onStoreChange);
  return () => {
    globalThis.visualViewport?.removeEventListener(`scroll`, onStoreChange);
  };
};

function getSnapshot(): VisualViewportScroll | null {
  // If the API isn't supported just bail out.
  if (globalThis.visualViewport == null) {
    return null;
  }

  // Calculate the new values but avoid allocating an object unnecessarily.
  const offsetLeft = globalThis.visualViewport.offsetLeft;
  const offsetTop = globalThis.visualViewport.offsetTop;

  // Return a cached stable value if it exists to avoid unnecessary re-renders.
  const lastValue = snapshotCache.get(globalThis.visualViewport);
  if (
    lastValue != null &&
    lastValue.offsetLeft === offsetLeft &&
    lastValue.offsetTop === offsetTop
  ) {
    return lastValue;
  }

  // Cache the new value and return it.
  const newValue = { offsetLeft, offsetTop };
  snapshotCache.set(globalThis.visualViewport, newValue);
  return newValue;
}

// Cache of viewport sizes. Probably overkill to use a map in case there are
// multiple VisualViewport instances, not sure.
const snapshotCache = new WeakMap<VisualViewport, VisualViewportScroll>();
