import { AppState } from "react-native";
import { useEffect, useState } from "react";

function isAppActive() {
  if (typeof document === `undefined`) {
    return AppState.currentState === `active`;
  }
  return document.visibilityState === `visible`;
}

function subscribeToAppActivity(onActivityChange: (active: boolean) => void) {
  if (typeof document === `undefined`) {
    const subscription = AppState.addEventListener(`change`, (state) => {
      onActivityChange(state === `active`);
    });
    return () => {
      subscription.remove();
    };
  }

  const onVisibilityChange = () => {
    onActivityChange(document.visibilityState === `visible`);
  };
  document.addEventListener(`visibilitychange`, onVisibilityChange);
  return () => {
    document.removeEventListener(`visibilitychange`, onVisibilityChange);
  };
}

export function useAppActivity() {
  const [isActive, setIsActive] = useState(isAppActive);

  useEffect(() => subscribeToAppActivity(setIsActive), []);

  return isActive;
}
