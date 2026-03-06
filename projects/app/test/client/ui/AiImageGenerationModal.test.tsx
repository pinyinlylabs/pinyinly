// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.js";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import type { AssetId } from "#data/model.js";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import { test as baseTest, beforeEach, describe, expect, vi } from "vitest";

const testWithRizzle = baseTest.extend(rizzleFixture);

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
  localImageAssetsMock,
  trpcMock,
  useImageUploaderMock,
} = vi.hoisted(() => {
  const mockGetAvailableLocalImageAssets = vi.fn<() => string[]>();
  const mockGetLocalImageAssetBase64 =
    vi.fn<() => Promise<{ data: string; mimeType: string } | undefined>>();
  const mockGetLocalImageAssetSource = vi.fn<() => Promise<{ uri: string }>>();
  const mockUseMutation =
    vi.fn<
      () => {
        mutateAsync: (args: unknown) => Promise<unknown>;
        isPending: boolean;
      }
    >();
  const mockUseImageUploader =
    vi.fn<
      () => {
        uploading: boolean;
        uploadImageBlob: (args: unknown) => Promise<void>;
      }
    >();

  return {
    mockGetAvailableLocalImageAssets,
    mockGetLocalImageAssetBase64,
    mockGetLocalImageAssetSource,
    mockUseMutation,
    mockUseImageUploader,
    localImageAssetsMock: {
      getAvailableLocalImageAssets: () => mockGetAvailableLocalImageAssets(),
      getLocalImageAssetBase64: async () => mockGetLocalImageAssetBase64(),
      getLocalImageAssetSource: async () => mockGetLocalImageAssetSource(),
    },
    trpcMock: {
      trpc: {
        ai: {
          generateHintImage: {
            useMutation: () => mockUseMutation(),
          },
        },
      },
    },
    useImageUploaderMock: {
      useImageUploader: () => mockUseImageUploader(),
    },
  };
});

vi.mock(`@/client/assets/localImageAssets`, () => localImageAssetsMock);
vi.mock(`@/client/assets/localImageAssets.ts`, () => localImageAssetsMock);
vi.mock(`#client/assets/localImageAssets.ts`, () => localImageAssetsMock);

vi.mock(`@/client/trpc`, () => trpcMock);
vi.mock(`@/client/trpc.tsx`, () => trpcMock);
vi.mock(`#client/trpc.tsx`, () => trpcMock);

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

const testContextProviders = (opts: { rizzle: Rizzle }) =>
  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={opts.rizzle}>
          <DbProvider>{children}</DbProvider>
        </RizzleProvider.Context.Provider>
      </QueryClientProvider>
    );
  };

describe(`AiImageGenerationModal suite`, () => {
  beforeEach(() => {
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

  testWithRizzle(`does not show style selector controls`, ({ rizzle }) => {
    const Wrapper = testContextProviders({ rizzle });
    render(
      <Wrapper>
        <AiImageGenerationModal
          initialPrompt=""
          onConfirm={vi.fn()}
          onDismiss={vi.fn()}
        />
      </Wrapper>,
    );

    expect(screen.queryByText(`Style image`)).not.toBeInTheDocument();
    expect(screen.queryByText(`Choose style image`)).not.toBeInTheDocument();
    expect(screen.queryByText(`Available styles:`)).not.toBeInTheDocument();
  });

  testWithRizzle(`renders image generation form`, ({ rizzle }) => {
    const Wrapper = testContextProviders({ rizzle });
    render(
      <Wrapper>
        <AiImageGenerationModal
          initialPrompt=""
          onConfirm={vi.fn()}
          onDismiss={vi.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByText(`AI image generator`)).toBeInTheDocument();
    expect(screen.getByText(`Image prompt`)).toBeInTheDocument();
    expect(screen.getByText(`Generate`)).toBeInTheDocument();
  });
});
