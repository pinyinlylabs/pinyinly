// @vitest-environment happy-dom

import { HeaderProvider } from "#client/ui/HeaderProvider.tsx";
import { render, screen } from "@testing-library/react";
import { Text } from "#client/ui/Text.tsx";
import { View } from "#client/ui/View.tsx";
import { describe, expect, test } from "vitest";

describe(`HeaderProvider`, () => {
  test(`renders portal content in the header slot when enabled`, () => {
    render(
      <HeaderProvider actionsSlotEnabled>
        <View testID="source">
          <HeaderProvider.ActionsPortal>
            <Text>Header action</Text>
          </HeaderProvider.ActionsPortal>
        </View>
        <View testID="slot">
          <HeaderProvider.ActionsSlot />
        </View>
      </HeaderProvider>,
    );

    expect(screen.getByTestId(`source`).textContent).toBe(``);
    expect(screen.getByTestId(`slot`).textContent).toBe(`Header action`);
  });

  test(`keeps portal content at its source when no slot is enabled`, () => {
    render(
      <HeaderProvider>
        <View testID="source">
          <HeaderProvider.ActionsPortal>
            <Text>Header action</Text>
          </HeaderProvider.ActionsPortal>
        </View>
        <View testID="slot">
          <HeaderProvider.ActionsSlot />
        </View>
      </HeaderProvider>,
    );

    expect(screen.getByTestId(`source`).textContent).toBe(`Header action`);
    expect(screen.getByTestId(`slot`).textContent).toBe(``);
  });
});
