// @vitest-environment happy-dom

import { Tabs } from "#client/ui/Tabs.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { Text, View } from "react-native";
import { describe, expect, test, vi } from "vitest";

describe(`Tabs suite` satisfies HasNameOf<typeof Tabs>, () => {
  test(`renders with default tab selected`, () => {
    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">
          <Text>Content 1</Text>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <Text>Content 2</Text>
        </Tabs.Content>
      </Tabs>,
    );

    expect(screen.getByText(`Tab 1`)).toBeInTheDocument();
    expect(screen.getByText(`Tab 2`)).toBeInTheDocument();
    expect(screen.getByText(`Content 1`)).toBeInTheDocument();
    expect(screen.queryByText(`Content 2`)).not.toBeInTheDocument();
  });

  test(`switches tabs when trigger is clicked`, () => {
    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">
          <Text>Content 1</Text>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <Text>Content 2</Text>
        </Tabs.Content>
      </Tabs>,
    );

    // Initially, tab1 content is visible
    expect(screen.getByText(`Content 1`)).toBeInTheDocument();
    expect(screen.queryByText(`Content 2`)).not.toBeInTheDocument();

    // Click on tab2
    fireEvent.click(screen.getByText(`Tab 2`));

    // Now tab2 content should be visible
    expect(screen.queryByText(`Content 1`)).not.toBeInTheDocument();
    expect(screen.getByText(`Content 2`)).toBeInTheDocument();
  });

  test(`renders multiple tabs correctly`, () => {
    render(
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
          <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">
          <Text>Overview Content</Text>
        </Tabs.Content>
        <Tabs.Content value="analytics">
          <Text>Analytics Content</Text>
        </Tabs.Content>
        <Tabs.Content value="reports">
          <Text>Reports Content</Text>
        </Tabs.Content>
      </Tabs>,
    );

    expect(screen.getByText(`Overview`)).toBeInTheDocument();
    expect(screen.getByText(`Analytics`)).toBeInTheDocument();
    expect(screen.getByText(`Reports`)).toBeInTheDocument();
    expect(screen.getByText(`Overview Content`)).toBeInTheDocument();
  });

  test(`cycles through all tabs correctly`, () => {
    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
          <Tabs.Trigger value="tab3">Tab 3</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">
          <Text>Content 1</Text>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <Text>Content 2</Text>
        </Tabs.Content>
        <Tabs.Content value="tab3">
          <Text>Content 3</Text>
        </Tabs.Content>
      </Tabs>,
    );

    // Start with tab1
    expect(screen.getByText(`Content 1`)).toBeInTheDocument();

    // Click tab2
    fireEvent.click(screen.getByText(`Tab 2`));
    expect(screen.getByText(`Content 2`)).toBeInTheDocument();
    expect(screen.queryByText(`Content 1`)).not.toBeInTheDocument();

    // Click tab3
    fireEvent.click(screen.getByText(`Tab 3`));
    expect(screen.getByText(`Content 3`)).toBeInTheDocument();
    expect(screen.queryByText(`Content 2`)).not.toBeInTheDocument();

    // Click back to tab1
    fireEvent.click(screen.getByText(`Tab 1`));
    expect(screen.getByText(`Content 1`)).toBeInTheDocument();
    expect(screen.queryByText(`Content 3`)).not.toBeInTheDocument();
  });

  test(`respects disabled state on trigger`, () => {
    const onClickSpy = vi.fn();

    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2" disabled onPress={onClickSpy}>
            Tab 2
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">
          <Text>Content 1</Text>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <Text>Content 2</Text>
        </Tabs.Content>
      </Tabs>,
    );

    // Try clicking disabled tab
    fireEvent.click(screen.getByText(`Tab 2`));

    // Should not switch tabs or call onPress
    expect(screen.getByText(`Content 1`)).toBeInTheDocument();
    expect(screen.queryByText(`Content 2`)).not.toBeInTheDocument();
    expect(onClickSpy).not.toHaveBeenCalled();
  });

  test(`throws error when Trigger is used outside Tabs`, () => {
    // Suppress console.error for this test as we expect an error
    const consoleError = vi
      .spyOn(console, `error`)
      .mockImplementation(() => {});

    expect(() => {
      render(
        <View>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
        </View>,
      );
    }).toThrow(`Tabs compound components must be used within a Tabs`);

    consoleError.mockRestore();
  });

  test(`throws error when Content is used outside Tabs`, () => {
    // Suppress console.error for this test as we expect an error
    const consoleError = vi
      .spyOn(console, `error`)
      .mockImplementation(() => {});

    expect(() => {
      render(
        <View>
          <Tabs.Content value="tab1">
            <Text>Content</Text>
          </Tabs.Content>
        </View>,
      );
    }).toThrow(`Tabs compound components must be used within a Tabs`);

    consoleError.mockRestore();
  });

  test(`calls custom onPress handler on Trigger`, () => {
    const onPressSpy = vi.fn();

    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2" onPress={onPressSpy}>
            Tab 2
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">
          <Text>Content 1</Text>
        </Tabs.Content>
        <Tabs.Content value="tab2">
          <Text>Content 2</Text>
        </Tabs.Content>
      </Tabs>,
    );

    fireEvent.click(screen.getByText(`Tab 2`));

    expect(onPressSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`Content 2`)).toBeInTheDocument();
  });

  test(`renders content with complex children`, () => {
    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">
          <View>
            <Text>Title</Text>
            <Text>Description</Text>
            <View>
              <Text>Nested content</Text>
            </View>
          </View>
        </Tabs.Content>
      </Tabs>,
    );

    expect(screen.getByText(`Title`)).toBeInTheDocument();
    expect(screen.getByText(`Description`)).toBeInTheDocument();
    expect(screen.getByText(`Nested content`)).toBeInTheDocument();
  });
});
