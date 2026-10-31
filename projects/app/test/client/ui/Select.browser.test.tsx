import { Select } from "#client/ui/Select.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { View } from "#client/ui/View.tsx";
import type { IconProps } from "#client/ui/Icon.tsx";
import "#global.css";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

vi.mock(import(`#client/ui/Icon.tsx`), () => ({
  Icon: ({ icon, size = 24 }: IconProps) => (
    <svg
      aria-hidden
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {icon === `check` ? (
        <path
          d="M4.69886 12.4084L6.7017 10.3984L9.99006 13.63L17.2841 6.36435L19.3011 8.37429L9.99006 17.6357L4.69886 12.4084Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M4.79289 8.54289C5.18342 8.15237 5.81658 8.15237 6.20711 8.54289L12 14.3358L17.7929 8.54289C18.1834 8.15237 18.8166 8.15237 19.2071 8.54289C19.5976 8.93341 19.5976 9.56658 19.2071 9.9571L13.4142 15.75C12.6332 16.531 11.3668 16.531 10.5858 15.75L4.79289 9.95711C4.40237 9.56658 4.40237 8.93342 4.79289 8.54289Z"
          fill="currentColor"
        />
      )}
    </svg>
  ),
}));

const options = [
  { value: `first`, label: `` },
  { value: `second`, label: `` },
] as const;

async function renderSelect(theme: `light` | `dark`, disabled = false) {
  await render(
    <Theme theme={theme}>
      <View testID="select-snapshot" className="inline-flex bg-bg p-8">
        <Select
          accessibilityLabel="Color scheme"
          options={options}
          value="first"
          onValueChange={() => {}}
          placeholder=""
          disabled={disabled}
        />
      </View>
    </Theme>,
  );
}

test.for([`light`, `dark`] as const)(
  `%s select trigger visual snapshots`,
  async (theme) => {
    await renderSelect(theme);

    const trigger = page.getByRole(`button`, { name: `Color scheme` });
    await expect.element(trigger).toBeInTheDocument();
    await expect(page.getByTestId(`select-snapshot`)).toMatchScreenshot(
      `${theme}-trigger`,
    );
    await page
      .getByTestId(`select-snapshot`)
      .hover({ position: { x: 1, y: 1 } });
    const initialBackground = getComputedStyle(
      trigger.element(),
    ).backgroundColor;
    await trigger.hover();
    await expect
      .poll(() => getComputedStyle(trigger.element()).backgroundColor)
      .not.toBe(initialBackground);

    const chevron = page
      .getByTestId(`select-snapshot`)
      .element()
      .querySelector(`svg`);
    if (chevron == null) {
      throw new Error(`Expected the Select trigger chevron`);
    }
    expect(chevron.getAttribute(`width`)).toBe(`16`);
    await expect(page.getByTestId(`select-snapshot`)).toMatchScreenshot(
      `${theme}-trigger-hover`,
    );
  },
);

test(`appearance-style Select trigger is right-aligned without stretching`, async () => {
  await render(
    <Theme theme="dark">
      <View testID="select-snapshot" className="flex w-80 flex-col bg-bg p-8">
        <Select
          accessibilityLabel="Color scheme"
          options={options}
          value="first"
          onValueChange={() => {}}
          placeholder=""
          className="self-end"
        />
      </View>
    </Theme>,
  );

  await expect.element(page.getByTestId(`select-snapshot`)).toBeInTheDocument();
  await expect
    .element(page.getByRole(`button`, { name: `Color scheme` }))
    .toBeInTheDocument();
  const container = page.getByTestId(`select-snapshot`).element();
  const trigger = page.getByRole(`button`, { name: `Color scheme` }).element();
  const containerRect = container.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  expect(Math.round(triggerRect.right)).toBe(
    Math.round(containerRect.right - 32),
  );
  expect(triggerRect.width).toBeLessThan(containerRect.width - 64);
  await expect(page.getByTestId(`select-snapshot`)).toMatchScreenshot(
    `right-aligned-trigger`,
  );
});

test.for([`light`, `dark`] as const)(
  `%s open select menu visual snapshot`,
  async (theme) => {
    await page.viewport(414, 220);
    await renderSelect(theme);
    const trigger = page.getByRole(`button`, { name: `Color scheme` });
    await expect.element(trigger).toBeInTheDocument();
    const triggerElement = trigger.element();
    const chevron = triggerElement.querySelector(`svg`);
    if (chevron == null) {
      throw new Error(`Expected the Select trigger chevron`);
    }
    const chevronContainer = chevron.parentElement;
    if (chevronContainer == null) {
      throw new Error(`Expected the Select trigger chevron container`);
    }
    await trigger.click();
    expect(triggerElement.getAttribute(`aria-expanded`)).toBe(`true`);
    expect(chevronContainer.classList.contains(`rotate-180`)).toBe(true);
    await expect(page).toMatchScreenshot(`${theme}-trigger-open`);

    const menu = page.getByRole(`listbox`);
    await expect.element(menu).toBeVisible();
    const checkIcon = menu.element().querySelector(`svg`);
    if (checkIcon == null) {
      throw new Error(`Expected the selected option checkmark`);
    }
    expect(checkIcon.getAttribute(`width`)).toBe(`16`);
    expect(checkIcon.getAttribute(`height`)).toBe(`16`);
    expect(page.getByRole(`option`).first()).toHaveAttribute(
      `aria-selected`,
      `true`,
    );
    expect(
      getComputedStyle(page.getByRole(`option`).first().element()).cursor,
    ).toBe(`pointer`);
    await expect(menu).toMatchScreenshot(`${theme}-menu-open`);
  },
);

test(`disabled select trigger visual snapshot`, async () => {
  await renderSelect(`light`, true);

  await expect
    .element(page.getByRole(`button`, { name: `Color scheme` }))
    .toBeDisabled();
  await expect(page.getByTestId(`select-snapshot`)).toMatchScreenshot(
    `disabled-trigger`,
  );
});
