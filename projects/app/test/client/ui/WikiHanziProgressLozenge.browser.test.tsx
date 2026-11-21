import { WikiHanziProgressLozengeDisplay } from "#client/ui/WikiHanziProgressLozenge.tsx";
import { Theme } from "#client/ui/Theme.tsx";
import { Text } from "#client/ui/Text.tsx";
import "#global.css";
import { useState } from "react";
import { Pressable } from "react-native";
import { PortalHost, PortalProvider } from "react-native-teleport";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

vi.mock(`#client/ui/Icon.tsx`, () => ({
  Icon: ({ icon }: { icon: string }) => (
    <span
      data-testid={icon}
      style={{ display: `inline-block`, width: 12, height: 12 }}
    />
  ),
}));
vi.mock(`expo-router`, () => ({ useRouter: () => ({ push: vi.fn() }) }));

function Meaning({ onSelect }: { onSelect: () => void }) {
  return (
    <PortalProvider>
      <Theme theme="dark">
        <Pressable
          accessible={false}
          focusable={false}
          onPress={onSelect}
          className="w-80 max-w-full flex-row flex-wrap items-center gap-2"
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: false }}
            aria-checked={false}
            onPress={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            <Text>feel; think</Text>
          </Pressable>
          <WikiHanziProgressLozengeDisplay
            rank={1}
            progress={0.5}
            hanziWord={`觉得:feel`}
            skillSrsStates={new Map()}
            hasPinyin
          />
        </Pressable>
        <PortalHost name="root" />
      </Theme>
    </PortalProvider>
  );
}

test(`one menu combines bookmark actions and proficiency without selecting the meaning`, async () => {
  const onSelect = vi.fn();
  await render(<Meaning onSelect={onSelect} />);

  const trigger = page.getByRole(`button`, {
    name: `Novice. Not bookmarked. Bookmark and proficiency details`,
  });
  await expect.element(trigger).toBeVisible();
  await expect
    .element(page.getByTestId(`bookmark-filled`))
    .not.toBeInTheDocument();
  await trigger.click();
  const bookmark = page.getByRole(`menuitemcheckbox`, { name: `Bookmark` });
  await expect.element(bookmark).not.toBeChecked();
  await expect
    .element(
      page.getByText(`Each word has its own proficiency level.`, {
        exact: false,
      }),
    )
    .toBeVisible();
  await expect
    .element(page.getByText(`Recognize meaning`, { exact: true }))
    .toBeVisible();
  await bookmark.click();

  const savedTrigger = page.getByRole(`button`, {
    name: `Novice. Bookmarked. Bookmark and proficiency details`,
  });
  await expect.element(savedTrigger).toBeVisible();
  await expect.element(page.getByTestId(`bookmark-filled`)).toBeVisible();
  expect(onSelect).not.toHaveBeenCalled();

  await savedTrigger.click();
  await expect.element(bookmark).toBeChecked();
  await bookmark.click();
  await expect.element(trigger).toBeVisible();
  await expect
    .element(page.getByTestId(`bookmark-filled`))
    .not.toBeInTheDocument();
  expect(onSelect).not.toHaveBeenCalled();

  await page.getByText(`feel; think`).click();
  expect(onSelect).toHaveBeenCalledOnce();
});

test(`keyboard users can open and dismiss the combined menu without selecting the meaning`, async () => {
  const onSelect = vi.fn();
  await render(<Meaning onSelect={onSelect} />);
  const trigger = page.getByRole(`button`, {
    name: `Novice. Not bookmarked. Bookmark and proficiency details`,
  });
  await expect.element(trigger).toBeVisible();
  trigger.element().focus();
  await userEvent.keyboard(`{Enter}`);
  await expect
    .element(page.getByRole(`menuitemcheckbox`, { name: `Bookmark` }))
    .toBeVisible();
  await userEvent.keyboard(`{Escape}`);
  await expect.element(trigger).toHaveFocus();
  expect(onSelect).not.toHaveBeenCalled();
});

test(`proficiency details stay scrollable inside a narrow viewport`, async () => {
  const { innerWidth, innerHeight } = window;
  await page.viewport(320, 480);
  try {
    await render(<Meaning onSelect={vi.fn()} />);
    await page
      .getByRole(`button`, {
        name: `Novice. Not bookmarked. Bookmark and proficiency details`,
      })
      .click();
    const menu = page.getByRole(`menu`);
    await expect.element(menu).toBeVisible();
    await expect
      .poll(() => {
        const rect = menu.element().getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= 320 &&
          rect.top >= 0 &&
          rect.bottom <= 480
        );
      })
      .toBe(true);

    const lastSkill = page.getByText(`Pronunciation tone`, { exact: true });
    lastSkill.element().scrollIntoView({ block: `nearest` });
    await expect
      .poll(() => {
        const rect = lastSkill.element().getBoundingClientRect();
        const menuRect = menu.element().getBoundingClientRect();
        return rect.top >= menuRect.top && rect.bottom <= menuRect.bottom;
      })
      .toBe(true);
    await userEvent.keyboard(`{Escape}`);
  } finally {
    await page.viewport(innerWidth, innerHeight);
  }
});
