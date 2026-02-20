import { Platform } from "react-native";

/**
 * Helper for {@link React.useEffect} + {@link document.addEventListener} +
 * {@link document.removeEventListener} boilerplate. Web only.
 *
 * @example
 *
 * useEffect(
 *   () => documentEventListenerEffect(`storage`, (event) => {
 *     // …
 *   }),
 *   []
 * );
 */
export function documentEventListenerEffect<K extends keyof DocumentEventMap>(
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => void,
): undefined | (() => void) {
  if (Platform.OS === `web`) {
    const ac = new AbortController();
    document.addEventListener(type, listener, { signal: ac.signal });
    return () => {
      ac.abort();
    };
  }
}
