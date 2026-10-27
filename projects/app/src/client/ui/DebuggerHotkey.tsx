import { useHotkey } from "@tanstack/react-hotkeys";
import { debuggerHotkey } from "@/client/ui/debuggerHotkeyDefinition";

export function DebuggerHotkey() {
  useHotkey(
    debuggerHotkey,
    () => {
      // oxlint-disable-next-line no-debugger -- Pausing is the purpose of this inspector shortcut.
      debugger;
    },
    { conflictBehavior: `allow` },
  );

  return null;
}
