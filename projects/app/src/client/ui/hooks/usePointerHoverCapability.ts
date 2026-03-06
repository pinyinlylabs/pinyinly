import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function usePointerHoverCapability(): boolean {
  const [isPointerHoverCapable, setIsPointerHoverCapable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== `web`) {
      return;
    }

    if (
      typeof window === `undefined` ||
      typeof window.matchMedia !== `function`
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(`(hover: hover) and (pointer: fine)`);

    const update = () => {
      setIsPointerHoverCapable(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === `function`) {
      mediaQuery.addEventListener(`change`, update);
      return () => {
        mediaQuery.removeEventListener(`change`, update);
      };
    }
  }, []);

  return isPointerHoverCapable;
}
