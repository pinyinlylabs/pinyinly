import { RectButton } from "#client/ui/RectButton.tsx";
import { ScopedVariables } from "#client/ui/ScopedVariables.tsx";
import { View } from "#client/ui/View.tsx";
import type { IconRegistry } from "#client/ui/iconRegistry.ts";
import { forcePseudoStateByTestId } from "#test/util/browser.ts";
import "#global.css";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

vi.mock(import(`#client/ui/iconRegistry.ts`), () => ({
  iconRegistry: {} as IconRegistry,
  iconNames: [],
}));

test(`filled RectButton focus-visible with default foreground`, async () => {
  await render(
    <View testID="pyly-snapshot" className="inline-flex p-8">
      <RectButton variant="filled" testID="rect-button">
        Continue
      </RectButton>
    </View>,
  );

  const button = page.getByTestId(`rect-button`);
  await expect.element(button).toBeInTheDocument();

  await forcePseudoStateByTestId(`rect-button`, [`focus-visible`]);
  await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(`default`);
});

test(`filled RectButton focus-visible with custom foreground`, async () => {
  await render(
    <View testID="pyly-snapshot" className="inline-flex p-8">
      <ScopedVariables variables={{ "--color-fg": `var(--color-danger)` }}>
        <RectButton variant="filled" testID="rect-button">
          Continue
        </RectButton>
      </ScopedVariables>
    </View>,
  );

  const button = page.getByTestId(`rect-button`);
  await expect.element(button).toBeInTheDocument();

  await forcePseudoStateByTestId(`rect-button`, [`focus-visible`]);
  await expect(page.getByTestId(`pyly-snapshot`)).toMatchScreenshot(
    `custom foreground`,
  );
});
