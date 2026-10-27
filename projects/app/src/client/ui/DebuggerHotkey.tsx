import { useHotkey } from "@tanstack/react-hotkeys";
import {
  DebuggerHotkey as debuggerHotkey,
  isDebuggerHotkeyAvailable,
} from "@/client/ui/DebuggerHotkey.utils";

export function DebuggerHotkey() {
  useHotkey(
    debuggerHotkey,
    () => {
      // oxlint-disable-next-line no-debugger -- Pausing is the purpose of this inspector shortcut.
      debugger;
    },
    { enabled: isDebuggerHotkeyAvailable, conflictBehavior: `allow` },
  );

  return null;
}
