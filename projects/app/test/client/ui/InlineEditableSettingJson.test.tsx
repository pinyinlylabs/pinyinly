// @vitest-environment happy-dom

import * as useUserSettingModule from "#client/ui/hooks/useUserSetting.ts";
import { InlineEditableSettingJson } from "#client/ui/InlineEditableSettingJson.tsx";
import type {
  UseUserSettingResult,
  UserSettingEntity,
} from "#client/ui/hooks/useUserSetting.ts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock(`#client/ui/hooks/useUserSetting.ts`, () => ({
  useUserSetting: vi.fn(),
}));

const mockSettingEntity = {
  marshalKey: vi.fn((k: { id: string }) => `mock-key-${k.id}`),
  _def: {
    valueType: {
      _def: {
        shape: {
          id: {},
          mnemonicIdentity: {},
        },
      },
    },
  },
} as unknown as UserSettingEntity;

const mockSetting = {
  kind: `userSetting` as const,
  entity: mockSettingEntity,
  decode: vi.fn(),
  encodeStoredValue: vi.fn(),
};

describe(`InlineEditableSettingJson`, () => {
  let mockSetValue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetValue = vi.fn();
    vi.clearAllMocks();
  });

  const setupTest = (currentValue: unknown) => {
    vi.spyOn(useUserSettingModule, `useUserSetting`).mockReturnValue({
      isLoading: false,
      value: currentValue,
      setValue: mockSetValue,
    } as unknown as UseUserSettingResult<UserSettingEntity>);
  };

  test(`saves valid JSON on Enter`, async () => {
    setupTest(null);

    render(
      <InlineEditableSettingJson<any>
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder='{"traits": ["curious"]}'
      />,
    );

    const input = screen.getByPlaceholderText(`{"traits": ["curious"]}`);
    fireEvent.change(input, {
      target: { value: `{"traits":["curious"]}` },
    });
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith({
        mnemonicIdentity: { traits: [`curious`] },
      });
    });
  });

  test(`clears setting when draft is empty on blur`, async () => {
    setupTest({ mnemonicIdentity: { traits: [`curious`] } });

    render(
      <InlineEditableSettingJson<any>
        setting={mockSetting}
        settingKey={{ id: `test` }}
      />,
    );

    const input = screen.getByRole(`textbox`);
    fireEvent.change(input, { target: { value: `   ` } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(null);
    });
  });

  test(`shows error and does not save invalid JSON`, async () => {
    setupTest(null);

    render(
      <InlineEditableSettingJson<any>
        setting={mockSetting}
        settingKey={{ id: `test` }}
        placeholder='{"traits": ["curious"]}'
      />,
    );

    const input = screen.getByPlaceholderText(`{"traits": ["curious"]}`);
    fireEvent.change(input, {
      target: { value: `{"traits": ["curious"]` },
    });
    fireEvent.keyDown(input, { key: `Enter`, code: `Enter` });

    await waitFor(() => {
      expect(
        screen.getByText(`Invalid JSON. Fix formatting before saving.`),
      ).toBeInTheDocument();
      expect(mockSetValue).not.toHaveBeenCalled();
    });
  });

  test(`readonly mode renders empty-state text`, () => {
    setupTest(null);

    render(
      <InlineEditableSettingJson<any>
        setting={mockSetting}
        settingKey={{ id: `test` }}
        readonly
        emptyStateText="No mnemonic identity JSON"
      />,
    );

    expect(screen.getByText(`No mnemonic identity JSON`)).toBeInTheDocument();
  });
});
