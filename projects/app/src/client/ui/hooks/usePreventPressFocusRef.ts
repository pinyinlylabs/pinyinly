import { useCallback, useRef } from "react";
import type { PressableInstance, ViewInstance } from "react-native";

/**
 * A hook that returns a ref that can be passed to a <Pressable> or <View>, that
 * binds and prevents the default behavior of touchstart and mousedown events to
 * avoid focusing the Pressable element on press.
 * On Web, calling .preventDefault() in onTouchStart() event will prevent
 * the native `click` event from firing, and also prevent react-native's
 * synthesized `onPress` from firing (though onPressIn and onPressOut will
 * still fire). But onPressOut will fire even when the press is cancelled
 * (e.g. the touch is moved outside the element and released), and there
 * doesn't seem to be a simple way to check for this.
 *
 * So when using this approach, it seems like the only sane trade-off is to
 * handle onPress inside the onPressIn rather than waiting for the
 * onPressOut.
 *
 * Calling .preventDefault() in onPointerDown() will prevent the onPressIn
 * event, however listening for `mousedown` and doing .preventDefault() on
 * that seems to stop focus from being taken, but still keeping the
 * Pressable onPressIn/onPressOut working.
 */
export function usePreventPressFocusRef(): React.Ref<ViewInstance> {
  const preventDefault = useCallback<EventListener>((e) => {
    e.preventDefault();
  }, []);

  const refObject = useRef<HTMLElement | null>(null);

  const refCallback = useCallback(
    (el: PressableInstance | null) => {
      if (el !== null && !(el instanceof HTMLElement)) {
        return;
      }

      if (el) {
        // React by default uses passive event listeners for `touchstart`,
        // `touchmove`, and `wheel` events. So we need to manually attach a non-passive
        // event handler.
        el.addEventListener(`touchstart`, preventDefault, { passive: false });
        el.addEventListener(`mousedown`, preventDefault, { passive: false });
      } else {
        refObject.current?.removeEventListener(`touchstart`, preventDefault);
        refObject.current?.removeEventListener(`mousedown`, preventDefault);
      }
      refObject.current = el;
    },
    [preventDefault],
  );

  return refCallback;
}
