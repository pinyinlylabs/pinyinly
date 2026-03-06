// @vitest-environment happy-dom

import { Tooltip } from "#client/ui/Tooltip.tsx";
import { TooltipProvider } from "#client/ui/TooltipProvider.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { Text, View } from "react-native";
import { describe, expect, test, vi } from "vitest";

// Mock @floating-ui/react-native
vi.mock(`@floating-ui/react-native`, () => ({
  useFloating: vi.fn(() => ({
    refs: {
      setReference: vi.fn(),
      setFloating: vi.fn(),
    },
    floatingStyles: {
      position: `absolute`,
      top: 100,
      left: 100,
    },
  })),
  shift: vi.fn(() => ({})),
  flip: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
}));

describe(`Tooltip suite` satisfies HasNameOf<typeof Tooltip>, () => {
  test(`renders trigger element`, () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <View>
            <Text>Hover me</Text>
          </View>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Text>Tooltip content</Text>
        </Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByText(`Hover me`)).toBeInTheDocument();
  });

  test(`renders with defaultOpen true shows content`, () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <View>
            <Text>Trigger</Text>
          </View>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Text>Tooltip content</Text>
        </Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByText(`Trigger`)).toBeInTheDocument();
    expect(screen.getByText(`Tooltip content`)).toBeInTheDocument();
  });

  test(`does not render content when defaultOpen is false`, () => {
    render(
      <Tooltip defaultOpen={false}>
        <Tooltip.Trigger>
          <View>
            <Text>Trigger</Text>
          </View>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Text>Tooltip content</Text>
        </Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByText(`Trigger`)).toBeInTheDocument();
    expect(screen.queryByText(`Tooltip content`)).not.toBeInTheDocument();
  });

  test(`renders rich content in tooltip`, () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <View>
            <Text>Trigger</Text>
          </View>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <View>
            <Text>Bold text</Text>
            <Text>Italic text</Text>
          </View>
        </Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByText(`Bold text`)).toBeInTheDocument();
    expect(screen.getByText(`Italic text`)).toBeInTheDocument();
  });

  test(`asChild prop merges props with child trigger`, () => {
    const onPress = vi.fn();

    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger asChild>
          <View>
            <Text onPress={onPress}>Custom trigger</Text>
          </View>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Text>Content</Text>
        </Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText(`Custom trigger`);
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test(`throws error when Tooltip.Trigger is used outside Tooltip`, () => {
    expect(() => {
      render(
        <Tooltip.Trigger>
          <View>
            <Text>Invalid</Text>
          </View>
        </Tooltip.Trigger>,
      );
    }).toThrow(`Tooltip compound components must be used within a Tooltip`);
  });

  test(`throws error when Tooltip.Content is used outside Tooltip`, () => {
    expect(() => {
      render(
        <Tooltip.Content>
          <Text>Invalid</Text>
        </Tooltip.Content>,
      );
    }).toThrow(`Tooltip compound components must be used within a Tooltip`);
  });

  test(`renders with custom className on content`, () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <View>
            <Text>Trigger</Text>
          </View>
        </Tooltip.Trigger>
        <Tooltip.Content className="bg-blue">
          <Text>Styled content</Text>
        </Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByText(`Styled content`)).toBeInTheDocument();
  });

  test(`TooltipProvider wraps tooltips`, () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <Tooltip.Trigger>
            <View>
              <Text>Trigger</Text>
            </View>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Text>Content</Text>
          </Tooltip.Content>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.getByText(`Trigger`)).toBeInTheDocument();
    expect(screen.getByText(`Content`)).toBeInTheDocument();
  });
});
