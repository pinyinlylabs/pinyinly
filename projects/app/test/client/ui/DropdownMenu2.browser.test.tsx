import { DropdownMenu2 } from "#client/ui/DropdownMenu2.tsx";
import { Text } from "#client/ui/Text.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import "#global.css";
import { PortalHost, PortalProvider } from "react-native-teleport";
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

test(`dropdown surfaces blur the background on web`, async () => {
  await render(
    <PortalProvider>
      <DropdownMenu2>
        <DropdownMenu2.Trigger asChild>
          <button data-testid="trigger" type="button">
            More
          </button>
        </DropdownMenu2.Trigger>
        <DropdownMenu2.Content data-testid="dropdown-content">
          <DropdownMenu2.Sub>
            <DropdownMenu2.SubTrigger>More options</DropdownMenu2.SubTrigger>
            <DropdownMenu2.SubContent data-testid="dropdown-sub-content">
              <DropdownMenu2.Item>Option</DropdownMenu2.Item>
            </DropdownMenu2.SubContent>
          </DropdownMenu2.Sub>
        </DropdownMenu2.Content>
      </DropdownMenu2>
    </PortalProvider>,
  );

  await page.getByTestId(`trigger`).click();
  await expect
    .element(page.getByTestId(`dropdown-content`))
    .toBeInTheDocument();
  await page.getByText(`More options`).click();
  await expect
    .element(page.getByTestId(`dropdown-sub-content`))
    .toBeInTheDocument();

  for (const testId of [`dropdown-content`, `dropdown-sub-content`]) {
    const menu = page.getByTestId(testId).element();
    expect(menu.classList.contains(`web:bg-bg-high/80`)).toBe(true);
    expect(getComputedStyle(menu).backdropFilter).toContain(`blur(`);
  }
});

test.for([`light`, `dark`] as const)(
  `%s nested submenu renders above the backdrop and remains clickable`,
  async (theme) => {
    const onPress = vi.fn();
    await render(
      <PortalProvider>
        <Theme theme={theme}>
          <DropdownMenu2>
            <DropdownMenu2.Trigger role="button">
              <Text>Open</Text>
            </DropdownMenu2.Trigger>
            <DropdownMenu2.Content overlayClassName="bg-black/50">
              <DropdownMenu2.Sub>
                <DropdownMenu2.SubTrigger>
                  <Text>Report a problem</Text>
                </DropdownMenu2.SubTrigger>
                <DropdownMenu2.SubContent testID="submenu">
                  <DropdownMenu2.Item testID="submenu-item" onPress={onPress}>
                    <Text>Wrong grade</Text>
                  </DropdownMenu2.Item>
                </DropdownMenu2.SubContent>
              </DropdownMenu2.Sub>
            </DropdownMenu2.Content>
          </DropdownMenu2>
          <PortalHost name="root" />
        </Theme>
      </PortalProvider>,
    );

    await page.getByRole(`button`, { name: `Open` }).click();
    await page.getByRole(`menuitem`, { name: `Report a problem` }).hover();
    const submenu = page.getByTestId(`submenu`);
    await expect.element(submenu).toBeVisible();
    const content = submenu.element();
    expect(getComputedStyle(content).boxShadow).not.toBe(`none`);
    const wrapper = content.closest(`[data-radix-popper-content-wrapper]`);
    expect(wrapper).not.toBeNull();
    if (wrapper == null) {
      throw new Error(`Expected a positioned submenu wrapper`);
    }
    await expect.poll(() => getComputedStyle(wrapper).zIndex).toBe(`50`);
    await expect
      .poll(() => {
        const rect = content.getBoundingClientRect();
        return content.contains(
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ),
        );
      })
      .toBe(true);

    await page.getByTestId(`submenu-item`).hover();
    await expect.element(submenu).toBeVisible();
    await page.getByTestId(`submenu-item`).click();
    expect(onPress).toHaveBeenCalledOnce();
    await expect.element(submenu).not.toBeInTheDocument();
  },
);
