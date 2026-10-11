// @vitest-environment happy-dom

import {
  KeyboardShortcutModalScope,
  KeyboardShortcutProvider,
} from "#client/ui/KeyboardShortcutProvider.tsx";
import { QuickSearchButton } from "#client/ui/QuickSearchButton.tsx";
import { useShortcut } from "#client/ui/hooks/useShortcut.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

const focus = vi.hoisted(() => ({ isFocused: true }));

vi.mock(`expo-router`, () => ({
  useIsFocused: () => focus.isFocused,
}));

vi.mock(`#client/ui/Icon.tsx`, () => ({
  Icon: () => null,
}));

vi.mock(`#client/ui/QuickSearchModal.tsx`, () => ({
  QuickSearchModal: () => <button type="button">Search opened</button>,
}));

function ShortcutAction({ onTrigger }: { onTrigger: () => void }) {
  useShortcut(`Mod+K`, onTrigger);
  return null;
}

function pressSearchShortcut(target: Document | HTMLElement = document) {
  const usesMeta = formatForDisplay(`Mod+K`).includes(`⌘`);
  fireEvent.keyDown(target, {
    key: `k`,
    metaKey: usesMeta,
    ctrlKey: !usesMeta,
  });
}

afterEach(() => {
  focus.isFocused = true;
});

describe(`useShortcut`, () => {
  test(`fires while the route is focused`, () => {
    const onTrigger = vi.fn();

    render(
      <KeyboardShortcutProvider>
        <ShortcutAction onTrigger={onTrigger} />
      </KeyboardShortcutProvider>,
    );

    pressSearchShortcut();

    expect(onTrigger).toHaveBeenCalledOnce();
  });

  test(`fires while a text input is focused`, () => {
    const onTrigger = vi.fn();
    const input = document.createElement(`input`);
    document.body.append(input);

    render(
      <KeyboardShortcutProvider>
        <ShortcutAction onTrigger={onTrigger} />
      </KeyboardShortcutProvider>,
    );

    input.focus();
    pressSearchShortcut(input);

    expect(onTrigger).toHaveBeenCalledOnce();
    input.remove();
  });

  test(`opens quick search with its displayed shortcut`, () => {
    render(
      <KeyboardShortcutProvider>
        <QuickSearchButton />
      </KeyboardShortcutProvider>,
    );

    expect(screen.getByText(formatForDisplay(`Mod+K`))).toBeInTheDocument();

    pressSearchShortcut();

    expect(screen.getByText(`Search opened`)).toBeInTheDocument();
  });

  test(`renders a stable shortcut hint on the server`, () => {
    const html = renderToString(
      <KeyboardShortcutProvider>
        <QuickSearchButton />
      </KeyboardShortcutProvider>,
    );

    expect(html).toContain(`⌘ K`);
  });

  test(`does not fire while the route is unfocused`, () => {
    focus.isFocused = false;
    const onTrigger = vi.fn();

    render(
      <KeyboardShortcutProvider>
        <ShortcutAction onTrigger={onTrigger} />
      </KeyboardShortcutProvider>,
    );

    pressSearchShortcut();

    expect(onTrigger).not.toHaveBeenCalled();
  });

  test(`only fires shortcuts in the topmost modal scope`, () => {
    const onRouteTrigger = vi.fn();
    const onModalTrigger = vi.fn();

    render(
      <KeyboardShortcutProvider>
        <ShortcutAction onTrigger={onRouteTrigger} />
        <KeyboardShortcutModalScope active>
          <ShortcutAction onTrigger={onModalTrigger} />
        </KeyboardShortcutModalScope>
      </KeyboardShortcutProvider>,
    );

    pressSearchShortcut();

    expect(onRouteTrigger).not.toHaveBeenCalled();
    expect(onModalTrigger).toHaveBeenCalledOnce();
  });

  test(`moves shortcut ownership to a newly opened nested modal`, () => {
    const onRouteTrigger = vi.fn();
    const onModalTrigger = vi.fn();
    const onNestedModalTrigger = vi.fn();

    function NestedModalTest() {
      const [isNestedModalOpen, setIsNestedModalOpen] = useState(false);

      return (
        <KeyboardShortcutModalScope active>
          <ShortcutAction onTrigger={onModalTrigger} />
          <button
            type="button"
            onClick={() => {
              setIsNestedModalOpen(true);
            }}
          >
            Open nested modal
          </button>
          {isNestedModalOpen ? (
            <KeyboardShortcutModalScope active>
              <ShortcutAction onTrigger={onNestedModalTrigger} />
            </KeyboardShortcutModalScope>
          ) : null}
        </KeyboardShortcutModalScope>
      );
    }

    const { getByText } = render(
      <KeyboardShortcutProvider>
        <ShortcutAction onTrigger={onRouteTrigger} />
        <NestedModalTest />
      </KeyboardShortcutProvider>,
    );

    pressSearchShortcut();
    expect(onModalTrigger).toHaveBeenCalledOnce();

    fireEvent.click(getByText(`Open nested modal`));
    pressSearchShortcut();

    expect(onRouteTrigger).not.toHaveBeenCalled();
    expect(onModalTrigger).toHaveBeenCalledOnce();
    expect(onNestedModalTrigger).toHaveBeenCalledOnce();
  });
});
