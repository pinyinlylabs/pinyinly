// @vitest-environment happy-dom

import type { AssetId } from "#data/model.js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

type AiImageGenerationModalType = (props: {
  initialPrompt: string;
  onConfirm: (assetId: AssetId) => void;
  onDismiss: () => void;
  onSavePrompt?: (prompt: string) => void;
}) => ReactElement;
let AiImageGenerationModal: AiImageGenerationModalType;

const {
  mockGetAvailableLocalImageAssets,
  mockGetLocalImageAssetBase64,
  mockGetLocalImageAssetSource,
  mockUseMutation,
  mockUseImageUploader,
} = vi.hoisted(() => {
  return {
    mockGetAvailableLocalImageAssets: vi.fn<() => string[]>(),
    mockGetLocalImageAssetBase64:
      vi.fn<() => Promise<{ data: string; mimeType: string } | undefined>>(),
    mockGetLocalImageAssetSource: vi.fn<() => Promise<{ uri: string }>>(),
    mockUseMutation:
      vi.fn<
        () => {
          mutateAsync: (args: unknown) => Promise<unknown>;
          isPending: boolean;
        }
      >(),
    mockUseImageUploader:
      vi.fn<
        () => {
          uploading: boolean;
          uploadImageBlob: (args: unknown) => Promise<void>;
        }
      >(),
  };
});

const localImageAssetsMock = {
  getAvailableLocalImageAssets: () => mockGetAvailableLocalImageAssets(),
  getLocalImageAssetBase64: async () => mockGetLocalImageAssetBase64(),
  getLocalImageAssetSource: async () => mockGetLocalImageAssetSource(),
};

vi.mock(`@/client/assets/localImageAssets`, () => localImageAssetsMock);
vi.mock(`@/client/assets/localImageAssets.ts`, () => localImageAssetsMock);
vi.mock(`#client/assets/localImageAssets.ts`, () => localImageAssetsMock);

const trpcMock = {
  trpc: {
    ai: {
      generateHintImage: {
        useMutation: () => mockUseMutation(),
      },
    },
  },
};

vi.mock(`@/client/trpc`, () => trpcMock);
vi.mock(`@/client/trpc.tsx`, () => trpcMock);
vi.mock(`#client/trpc.tsx`, () => trpcMock);

const useImageUploaderMock = {
  useImageUploader: () => mockUseImageUploader(),
};

vi.mock(`@/client/ui/hooks/useImageUploader`, () => useImageUploaderMock);
vi.mock(`@/client/ui/hooks/useImageUploader.ts`, () => useImageUploaderMock);
vi.mock(`#client/ui/hooks/useImageUploader.ts`, () => useImageUploaderMock);

const pageSheetModalMock = {
  PageSheetModal: ({
    children,
  }: {
    children: (opts: { dismiss: () => void }) => ReactElement;
  }) => <div>{children({ dismiss: vi.fn() })}</div>,
};

vi.mock(`@/client/ui/PageSheetModal`, () => pageSheetModalMock);
vi.mock(`@/client/ui/PageSheetModal.tsx`, () => pageSheetModalMock);
vi.mock(`#client/ui/PageSheetModal.tsx`, () => pageSheetModalMock);

const rectButtonMock = {
  RectButton: ({
    onPress,
    children,
    disabled,
  }: {
    onPress?: () => void;
    children?: ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
};

vi.mock(`@/client/ui/RectButton`, () => rectButtonMock);
vi.mock(`@/client/ui/RectButton.tsx`, () => rectButtonMock);
vi.mock(`#client/ui/RectButton.tsx`, () => rectButtonMock);

const textInputSingleMock = {
  TextInputSingle: ({
    value,
    onChangeText,
  }: {
    value: string;
    onChangeText: (value: string) => void;
  }) => (
    <input
      value={value}
      onChange={(event) => {
        onChangeText(event.currentTarget.value);
      }}
    />
  ),
};

vi.mock(`@/client/ui/TextInputSingle`, () => textInputSingleMock);
vi.mock(`@/client/ui/TextInputSingle.tsx`, () => textInputSingleMock);
vi.mock(`#client/ui/TextInputSingle.tsx`, () => textInputSingleMock);

vi.mock(`react-native`, () => ({
  View: ({ children, ...props }: { children?: ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  Text: ({ children, ...props }: { children?: ReactNode }) => (
    <span {...props}>{children}</span>
  ),
  ScrollView: ({
    children,
    contentContainerClassName: _contentContainerClassName,
    ...props
  }: {
    children?: ReactNode;
    contentContainerClassName?: string;
  }) => <div {...props}>{children}</div>,
  Image: ({
    source,
    resizeMode: _resizeMode,
    ...props
  }: {
    source?: { uri?: string } | null;
    resizeMode?: string;
  }) => {
    const uri = source?.uri ?? ``;
    return <img src={uri} alt="" {...props} />;
  },
}));

describe(`AiImageGenerationModal suite`, () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAvailableLocalImageAssets.mockReturnValue([
      `style:one`,
      `style:two`,
    ]);
    mockGetLocalImageAssetSource.mockResolvedValue({
      uri: `mock://style:one`,
    });
    mockGetLocalImageAssetBase64.mockResolvedValue({
      data: `abc123`,
      mimeType: `image/png`,
    });
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseImageUploader.mockReturnValue({
      uploading: false,
      uploadImageBlob: vi.fn(),
    });
  });

  beforeEach(async () => {
    const module = await import(`#client/ui/AiImageGenerationModal.tsx`);
    AiImageGenerationModal = module.AiImageGenerationModal;
  });

  test(`shows available style previews`, async () => {
    render(
      <AiImageGenerationModal
        initialPrompt=""
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(`Choose style image`));

    expect(await screen.findByText(`Available styles:`)).toBeInTheDocument();
    expect(screen.getByText(`style:one`)).toBeInTheDocument();
    expect(screen.getByText(`style:two`)).toBeInTheDocument();
  });

  test(`selects a style image`, async () => {
    render(
      <AiImageGenerationModal
        initialPrompt=""
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(`Choose style image`));

    const styleOption = await screen.findByText(`style:one`);
    fireEvent.click(styleOption);

    await waitFor(() => {
      expect(screen.getByText(`Selected: style:one`)).toBeInTheDocument();
    });
  });
});
