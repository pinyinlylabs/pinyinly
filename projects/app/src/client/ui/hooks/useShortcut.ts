import {
  KeyboardShortcutModalContext,
  KeyboardShortcutModalIdContext,
} from "@/client/ui/contexts";
import type {
  FormatDisplayOptions,
  RegisterableHotkey,
} from "@tanstack/react-hotkeys";
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { useIsFocused } from "expo-router";
import { use, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";

function subscribeToPlatformChanges(onStoreChange: () => void) {
  if (Platform.OS === `web`) {
    globalThis.addEventListener(`pageshow`, onStoreChange);
    return () => {
      globalThis.removeEventListener(`pageshow`, onStoreChange);
    };
  }

  const subscription = AppState.addEventListener(`change`, onStoreChange);
  return () => {
    subscription.remove();
  };
}

export function formatShortcutForDisplay(
  shortcut: RegisterableHotkey,
  platform = getShortcutDisplayPlatform(),
) {
  return formatForDisplay(shortcut, { platform });
}

export function useShortcutDisplayLabel(shortcut: RegisterableHotkey) {
  return useSyncExternalStore(
    subscribeToPlatformChanges,
    () => formatShortcutForDisplay(shortcut),
    () =>
      formatShortcutForDisplay(
        shortcut,
        getShortcutDisplayPlatform() ?? `linux`,
      ),
  );
}

export function useShortcut(
  shortcut: RegisterableHotkey,
  callback: () => void,
) {
  const isFocused = useIsFocused();
  const modalContext = use(KeyboardShortcutModalContext);
  const modalId = use(KeyboardShortcutModalIdContext);
  const isTopmostScope =
    modalContext != null &&
    (modalId == null
      ? modalContext.modalStack.length === 0
      : modalContext.modalStack.at(-1) === modalId);

  useHotkey(shortcut, callback, {
    enabled: Platform.OS === `web` && isFocused && isTopmostScope,
  });
}

function getShortcutDisplayPlatform():
  | FormatDisplayOptions[`platform`]
  | undefined {
  if (Platform.OS === `web`) {
    return undefined;
  }
  if (Platform.OS === `ios` || Platform.OS === `macos`) {
    return `mac`;
  }
  if (Platform.OS === `windows`) {
    return `windows`;
  }
  return `linux`;
}
