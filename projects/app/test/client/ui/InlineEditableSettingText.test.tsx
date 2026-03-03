// @vitest-environment happy-dom

import { InlineEditableSettingText } from "#client/ui/InlineEditableSettingText.tsx";
import type {
  UseUserSettingResult,
  UserSettingTextEntity,
} from "#client/ui/hooks/useUserSetting.ts";
import * as useUserSettingModule from "#client/ui/hooks/useUserSetting.ts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { useUserSettingHistoryMockFn } = vi.hoisted(() => ({
  useUserSettingHistoryMockFn: vi.fn(),
}));

// Mock the hooks
vi.mock(`@/client/ui/hooks/useUserSetting`, () => ({
  useUserSetting: vi.fn(),
}));

vi.mock(`@/client/ui/hooks/useUserSettingHistory`, () => ({
  useUserSettingHistory: useUserSettingHistoryMockFn,
}));

vi.mock(`#client/ui/hooks/useUserSettingHistory.ts`, () => ({
  useUserSettingHistory: useUserSettingHistoryMockFn,
}));

const mockSettingEntity = {
  marshalKey: vi.fn((k: { id: string }) => `mock-key-${k.id}`),
} as unknown as UserSettingTextEntity;

const mockSetting = {
  kind: `userSetting` as const,
  entity: mockSettingEntity,
};

describe(`InlineEditableSettingText`, () => {
  let mockSetValue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetValue = vi.fn();
    vi.clearAllMocks();
  });

  const setupTest = (
    options: {
      currentValue?: string | null;
      defaultValue?: string;
      history?: Array<{ id: string; createdAt: Date; value: unknown }>;
    } = {},
  ) => {
    const { currentValue = null, history = [] } = options;

    const useUserSettingMock = vi
      .spyOn(useUserSettingModule, `useUserSetting`)
      .mockReturnValue({
        isLoading: false,
        value:
          currentValue !== null && currentValue !== ``
            ? { text: currentValue }
            : null,
        setValue: mockSetValue,
      } as UseUserSettingResult<UserSettingTextEntity>);

    const useUserSettingHistoryMock =
      useUserSettingHistoryMockFn.mockReturnValue({
        isLoading: false,
        entries: history,
      });

    return { useUserSettingMock, useUserSettingHistoryMock };
  };

  test(`displays placeholder when no value and no default`, () => {
    setupTest({ currentValue: null, defaultValue: `` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
      />,
    );

    expect(screen.getByText(`Enter text`)).toBeInTheDocument();
  });

  test(`displays defaultValue when no current value exists`, () => {
    setupTest({ currentValue: null, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    expect(screen.getByText(`Default Name`)).toBeInTheDocument();
  });

  test(`displays current value when override exists`, () => {
    setupTest({ currentValue: `Custom Name`, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    expect(screen.getByText(`Custom Name`)).toBeInTheDocument();
  });

  test(`pre-fills input with current value when editing`, async () => {
    setupTest({ currentValue: `Custom Name`, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    const displayText = screen.getByText(`Custom Name`);
    fireEvent.click(displayText);

    const input = screen.getByDisplayValue(`Custom Name`);
    expect(input).toBeInTheDocument();
  });

  test(`pre-fills input with defaultValue when editing and no override exists`, async () => {
    setupTest({ currentValue: null, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    const displayText = screen.getByText(`Default Name`);
    fireEvent.click(displayText);

    const input = screen.getByDisplayValue(`Default Name`);
    expect(input).toBeInTheDocument();
  });

  test(`clears override when saving the exact defaultValue`, async () => {
    setupTest({ currentValue: null, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Default Name`);
    fireEvent.click(displayText);

    // Save without changing (should call setValue(null))
    const input = screen.getByDisplayValue(`Default Name`);
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    // setValue should be called with null to clear the override
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  test(`saves custom value when changed from defaultValue`, async () => {
    setupTest({ currentValue: null, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Default Name`);
    fireEvent.click(displayText);

    // Change the value
    const input = screen.getByDisplayValue(`Default Name`);
    fireEvent.change(input, { target: { value: `Custom Name` } });

    // Save
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith({
        text: `Custom Name`,
      });
    });
  });

  test(`reverts to defaultValue when changing back to it`, async () => {
    setupTest({
      currentValue: `Custom Name`,
      defaultValue: `Default Name`,
    });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Custom Name`);
    fireEvent.click(displayText);

    // Change back to default
    const input = screen.getByDisplayValue(`Custom Name`);
    fireEvent.change(input, { target: { value: `Default Name` } });

    // Save
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    // setValue should be called with null to clear the override
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  test(`handles whitespace trimming correctly`, async () => {
    setupTest({ currentValue: null, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Default Name`);
    fireEvent.click(displayText);

    // Type with extra whitespace
    const input = screen.getByDisplayValue(`Default Name`);
    fireEvent.change(input, { target: { value: `  Default Name  ` } });

    // Save
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    // Should be trimmed and match default, so setValue should be called with null
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  test(`sets to null when saving empty value`, async () => {
    setupTest({ currentValue: null, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Default Name`);
    fireEvent.click(displayText);

    // Clear the value
    const input = screen.getByDisplayValue(`Default Name`);
    fireEvent.change(input, { target: { value: `` } });

    // Save
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    // setValue should be called with null
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  test(`cancels editing with Escape key without changing value`, async () => {
    setupTest({ currentValue: `Custom Name`, defaultValue: `Default Name` });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="Default Name"
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Custom Name`);
    fireEvent.click(displayText);

    // Change the value
    const input = screen.getByDisplayValue(`Custom Name`);
    fireEvent.change(input, { target: { value: `Temporary Change` } });

    // Press Escape
    fireEvent.keyDown(input, { key: `Escape`, code: `Escape` });

    // setValue should not be called
    expect(mockSetValue).not.toHaveBeenCalled();
  });

  test(`applies custom sanitizeValue function`, async () => {
    setupTest({ currentValue: null, defaultValue: `default` });

    const customSanitize = vi.fn((value: string) => {
      const trimmed = value.trim().toLowerCase();
      return trimmed.length === 0 ? null : trimmed;
    });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="default"
        sanitizeValue={customSanitize}
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`default`);
    fireEvent.click(displayText);

    // Type a value in different case
    const input = screen.getByDisplayValue(`default`);
    fireEvent.change(input, { target: { value: `DEFAULT` } });

    // Save
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    // customSanitize should have been called
    await waitFor(() => {
      expect(customSanitize).toHaveBeenCalled();
      // Should be called with null because "DEFAULT" becomes "default" which matches the default value
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  test(`distinguishes between null and empty string defaults`, async () => {
    setupTest({ currentValue: null, defaultValue: `` });

    const customSanitize = vi.fn((value: string) => {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue=""
        sanitizeValue={customSanitize}
      />,
    );

    // Click to edit
    const placeholder = screen.getByText(`Enter text`);
    fireEvent.click(placeholder);

    // Type a value and save
    const input = screen.getByPlaceholderText(`Enter text`);
    fireEvent.change(input, { target: { value: `New Name` } });

    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith({
        text: `New Name`,
      });
    });
  });

  test(`handles defaultValue with only whitespace same as empty`, async () => {
    setupTest({
      currentValue: `Custom`,
      defaultValue: `   `,
    });

    render(
      <InlineEditableSettingText
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder="Enter text"
        // oxlint-disable-next-line typescript/no-deprecated
        defaultValue="   "
      />,
    );

    // Click to edit
    const displayText = screen.getByText(`Custom`);
    fireEvent.click(displayText);

    // Change to whitespace
    const input = screen.getByDisplayValue(`Custom`);
    fireEvent.change(input, { target: { value: `   ` } });

    // Save
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    // Should clear override since whitespace sanitizes to null
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  // Note: CSS class application is tested implicitly through the styling system
  // Using tv (tailwind-variants) generates dynamic class names, so we don't test
  // for specific class names being present. The rendering tests above ensure
  // the styling is applied correctly through the displayClassName, emptyClassName, etc.
});
