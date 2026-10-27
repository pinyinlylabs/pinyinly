// @vitest-environment happy-dom

import { DebuggerHotkey as DebuggerHotkeyComponent } from "#client/ui/DebuggerHotkey.tsx";
import {
  KeyboardShortcutModalScope,
  KeyboardShortcutProvider,
} from "#client/ui/KeyboardShortcutProvider.tsx";
import {
  DebuggerHotkey,
  isDebuggerHotkeyAvailable,
} from "#client/ui/DebuggerHotkey.utils.ts";
import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useHotkey: vi.fn(),
}));

vi.mock(`@tanstack/react-hotkeys`, () => ({
  useHotkey: mocks.useHotkey,
}));

test(`registers the debugger hotkey while a modal shortcut scope is active`, () => {
  render(
    <KeyboardShortcutProvider>
      <KeyboardShortcutModalScope active>
        <DebuggerHotkeyComponent />
      </KeyboardShortcutModalScope>
    </KeyboardShortcutProvider>,
  );

  expect(mocks.useHotkey).toHaveBeenCalledWith(
    DebuggerHotkey,
    expect.any(Function),
    { enabled: isDebuggerHotkeyAvailable, conflictBehavior: `allow` },
  );
});
