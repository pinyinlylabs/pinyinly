import { NavigationContext } from "@react-navigation/native";
import { use, useEffect, useState } from "react";

export function useIsAppFocused() {
  const navigation = use(NavigationContext);
  const [isFocused, setIsFocused] = useState(
    () => navigation?.isFocused() ?? true,
  );

  useEffect(() => {
    if (navigation == null) {
      return;
    }

    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setIsFocused(navigation.isFocused());

    const unsubscribeFocus = navigation.addListener(`focus`, () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener(`blur`, () => {
      setIsFocused(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return isFocused;
}
