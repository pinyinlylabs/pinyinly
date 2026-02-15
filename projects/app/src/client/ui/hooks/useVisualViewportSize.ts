import { useSyncExternalStore } from "react";

export interface VisualViewportSize {
  /**
   * VisualViewport height {@link https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/height}
   */
  height: number;
  /**
   * VisualViewport width {@link https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/width}
   */
  width: number;
}

/**
 * A hook that returns the size of the visual viewport
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport} when
 * it changes size (e.g. due to on-screen keyboard appearing).
 */
export function useVisualViewportSize(): VisualViewportSize | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}

const subscribe = (onStoreChange: () => void) => {
  // Because this hook is specifically only for getting the size of the
  // viewport we only need to listen to the `resize` event and not the
  // `scroll` or `scrollend` events.
  globalThis.visualViewport?.addEventListener(`resize`, onStoreChange);
  return () => {
    globalThis.visualViewport?.removeEventListener(`resize`, onStoreChange);
  };
};

function getSnapshot(): VisualViewportSize | null {
  // If the API isn't supported just bail out.
  if (globalThis.visualViewport == null) {
    return null;
  }

  // Calculate the new values but avoid allocating an object unnecessarily.
  const width = globalThis.visualViewport.width;
  const height = globalThis.visualViewport.height;

  // Return a cached stable value if it exists to avoid unnecessary re-renders.
  const lastValue = snapshotCache.get(globalThis.visualViewport);
  if (
    lastValue != null &&
    lastValue.height === height &&
    lastValue.width === width
  ) {
    return lastValue;
  }

  // Cache the new value and return it.
  const newValue = { width, height };
  snapshotCache.set(globalThis.visualViewport, newValue);
  return newValue;
}

// Cache of viewport sizes. Probably overkill to use a map in case there are
// multiple VisualViewport instances, not sure.
const snapshotCache = new WeakMap<VisualViewport, VisualViewportSize>();
