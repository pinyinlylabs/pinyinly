import { DropdownMenu2 } from "#client/ui/DropdownMenu2.tsx";
import "#global.css";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

vi.mock(`#client/ui/Icon.tsx`, () => ({ Icon: () => null }));

test(`double-clicking the trigger suppresses native text selection`, async () => {
  await render(
    <DropdownMenu2>
      <DropdownMenu2.Trigger asChild>
        <button data-testid="trigger" type="button">
          More
        </button>
      </DropdownMenu2.Trigger>
      <p data-testid="toast-copy">Correct answer</p>
    </DropdownMenu2>,
  );

  const triggerLocator = page.getByTestId(`trigger`);
  await expect.element(triggerLocator).toBeInTheDocument();
  const trigger = triggerLocator.element();
  await triggerLocator.dblClick();
  expect(getComputedStyle(trigger).userSelect).toBe(`none`);
  expect(trigger.ownerDocument.defaultView?.getSelection()?.toString()).toBe(
    ``,
  );
  expect(
    getComputedStyle(page.getByTestId(`toast-copy`).element()).userSelect,
  ).not.toBe(`none`);
});
