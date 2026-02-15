import { Platform } from "react-native";

/**
 * Helper for {@link React.useEffect} + {@link window.addEventListener} +
 * {@link window.removeEventListener} boilerplate. Web only.
 *
 * @example
 *
 * useEffect(
 *   () => windowEventListenerEffect(`storage`, (event) => {
 *     // …
 *   }),
 *   []
 * );
 */
export function windowEventListenerEffect<K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => void,
): undefined | (() => void) {
  if (Platform.OS === `web`) {
    const ac = new AbortController();
    globalThis.addEventListener(type, listener, { signal: ac.signal });
    return () => {
      ac.abort();
    };
  }
}
