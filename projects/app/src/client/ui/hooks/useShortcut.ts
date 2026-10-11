import {
  KeyboardShortcutModalContext,
  KeyboardShortcutModalIdContext,
} from "@/client/ui/contexts";
import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useIsFocused } from "expo-router";
import { use } from "react";
import { Platform } from "react-native";

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
