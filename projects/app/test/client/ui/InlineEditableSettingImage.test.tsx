// @vitest-environment happy-dom

import type { UseUserSettingResult } from "#client/ui/hooks/useUserSetting.ts";
import * as useUserSettingModule from "#client/ui/hooks/useUserSetting.ts";
import { InlineEditableSettingImage } from "#client/ui/InlineEditableSettingImage.tsx";
import type { UserSettingImageEntity } from "#data/userSettings.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { useUserSettingHistoryMockFn, usePointerHoverCapabilityMockFn } =
  vi.hoisted(() => ({
    useUserSettingHistoryMockFn: vi.fn(),
    usePointerHoverCapabilityMockFn: vi.fn(),
  }));

vi.mock(`#client/ui/hooks/useUserSetting.ts`, () => ({
  useUserSetting: vi.fn(),
  getSettingKeyInfo: vi.fn(() => ({ settingKey: `mock-storage-key` })),
}));

vi.mock(`#client/ui/hooks/useUserSettingHistory.ts`, () => ({
  useUserSettingHistory: useUserSettingHistoryMockFn,
}));

vi.mock(`#client/ui/hooks/usePointerHoverCapability.ts`, () => ({
  usePointerHoverCapability: usePointerHoverCapabilityMockFn,
}));

// Prevent heavy image component from crashing the test renderer
vi.mock(`#client/ui/ImageFrame.tsx`, () => ({
  FramedAssetImage: () => null,
}));

vi.mock(`#client/ui/AiImageGenerationPanel.tsx`, () => ({
  AiImageGenerationPanel: () => null,
}));

const mockSettingEntity = {
  marshalKey: vi.fn((k: { id: string }) => `mock-key-${k.id}`),
} as unknown as UserSettingImageEntity;

const mockSetting = {
  kind: `userSetting` as const,
  entity: mockSettingEntity,
  decode: vi.fn(),
  encodeStoredValue: vi.fn(),
};

const mockSettingKey = { id: `test-image` };

describe(`InlineEditableSettingImage`, () => {
  let mockSetValue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetValue = vi.fn();
    vi.clearAllMocks();

    // Non-hover-capable by default → buttons always visible
    usePointerHoverCapabilityMockFn.mockReturnValue(false);

    useUserSettingHistoryMockFn.mockReturnValue({
      isLoading: false,
      entries: [],
    });
  });

  const setupWithImage = (imageId: string) => {
    vi.spyOn(useUserSettingModule, `useUserSetting`).mockReturnValue({
      isLoading: false,
      value: { imageId },
      setValue: mockSetValue,
    } as unknown as UseUserSettingResult<UserSettingImageEntity>);
  };

  const setupWithoutImage = () => {
    vi.spyOn(useUserSettingModule, `useUserSetting`).mockReturnValue({
      isLoading: false,
      value: null,
      setValue: mockSetValue,
    } as unknown as UseUserSettingResult<UserSettingImageEntity>);
  };

  test(`shows Clear button when an image is set`, () => {
    setupWithImage(`asset-123`);

    render(
      <InlineEditableSettingImage
        setting={mockSetting}
        settingKey={mockSettingKey}
      />,
    );

    expect(screen.getByText(`Clear`)).toBeInTheDocument();
  });

  test(`does not show Clear button when no image is set`, () => {
    setupWithoutImage();

    render(
      <InlineEditableSettingImage
        setting={mockSetting}
        settingKey={mockSettingKey}
      />,
    );

    expect(screen.queryByText(`Clear`)).not.toBeInTheDocument();
  });

  test(`pressing Clear calls setValue(null)`, () => {
    setupWithImage(`asset-123`);

    render(
      <InlineEditableSettingImage
        setting={mockSetting}
        settingKey={mockSettingKey}
      />,
    );

    fireEvent.click(screen.getByText(`Clear`));

    expect(mockSetValue).toHaveBeenCalledOnce();
    expect(mockSetValue).toHaveBeenCalledWith(null);
  });

  test(`Clear button is not shown in readonly mode`, () => {
    setupWithImage(`asset-123`);

    render(
      <InlineEditableSettingImage
        setting={mockSetting}
        settingKey={mockSettingKey}
        readonly
      />,
    );

    expect(screen.queryByText(`Clear`)).not.toBeInTheDocument();
  });

  test(`Change button is still shown alongside Clear`, () => {
    setupWithImage(`asset-123`);

    render(
      <InlineEditableSettingImage
        setting={mockSetting}
        settingKey={mockSettingKey}
      />,
    );

    expect(screen.getByText(`Change`)).toBeInTheDocument();
    expect(screen.getByText(`Clear`)).toBeInTheDocument();
  });
});
