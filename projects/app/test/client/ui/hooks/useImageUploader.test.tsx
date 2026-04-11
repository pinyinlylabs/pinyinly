// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const {
  clearCacheMock,
  confirmAssetUploadMock,
  confirmUploadMutateAsync,
  failAssetUploadMock,
  getArrayBufferAssetIdMock,
  initAssetMock,
  requestUploadUrlMutateAsync,
  setCacheMock,
  trpcMock,
  useAssetImageCacheMutationMock,
  useRizzleMock,
  utilAssetIdMock,
} = vi.hoisted(() => {
  const requestUploadUrlMutateAsync = vi.fn();
  const confirmUploadMutateAsync = vi.fn();
  const setCacheMock = vi.fn();
  const clearCacheMock = vi.fn();
  const initAssetMock = vi.fn();
  const confirmAssetUploadMock = vi.fn();
  const failAssetUploadMock = vi.fn();
  const getArrayBufferAssetIdMock = vi.fn();

  return {
    clearCacheMock,
    confirmAssetUploadMock,
    confirmUploadMutateAsync,
    failAssetUploadMock,
    getArrayBufferAssetIdMock,
    initAssetMock,
    requestUploadUrlMutateAsync,
    setCacheMock,
    trpcMock: {
      trpc: {
        asset: {
          requestUploadUrl: {
            useMutation: () => ({ mutateAsync: requestUploadUrlMutateAsync }),
          },
          confirmUpload: {
            useMutation: () => ({ mutateAsync: confirmUploadMutateAsync }),
          },
        },
      },
    },
    useAssetImageCacheMutationMock: {
      useAssetImageCacheMutation: () => ({
        setCache: setCacheMock,
        clearCache: clearCacheMock,
      }),
    },
    useRizzleMock: {
      useRizzle: () => ({
        mutate: {
          initAsset: initAssetMock,
          confirmAssetUpload: confirmAssetUploadMock,
          failAssetUpload: failAssetUploadMock,
        },
      }),
    },
    utilAssetIdMock: {
      getArrayBufferAssetId: getArrayBufferAssetIdMock,
    },
  };
});

vi.mock(`#client/trpc.tsx`, () => trpcMock);
vi.mock(
  `#client/ui/hooks/useAssetImageCacheMutation.ts`,
  () => useAssetImageCacheMutationMock,
);
vi.mock(
  `#client/ui/hooks/useAssetImageCacheMutation.web.ts`,
  () => useAssetImageCacheMutationMock,
);
vi.mock(`#client/ui/hooks/useRizzle.ts`, () => useRizzleMock);
vi.mock(`#util/assetId.ts`, () => utilAssetIdMock);

async function importUseImageUploader() {
  return (await import(`#client/ui/hooks/useImageUploader.ts`))
    .useImageUploader;
}

beforeEach(() => {
  requestUploadUrlMutateAsync.mockReset();
  confirmUploadMutateAsync.mockReset();
  setCacheMock.mockReset();
  clearCacheMock.mockReset();
  initAssetMock.mockReset();
  confirmAssetUploadMock.mockReset();
  failAssetUploadMock.mockReset();
  getArrayBufferAssetIdMock.mockReset();
  vi.restoreAllMocks();
  vi.spyOn(console, `error`).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test(`clears pending cache when upload fails after assetId is computed`, async () => {
  const useImageUploader = await importUseImageUploader();
  const onUploadComplete = vi.fn();
  const onUploadError = vi.fn();
  const assetId = `sha256/asset-image-id`;

  getArrayBufferAssetIdMock.mockResolvedValue(assetId);
  setCacheMock.mockResolvedValue(undefined);
  clearCacheMock.mockResolvedValue(undefined);
  requestUploadUrlMutateAsync.mockRejectedValue(new Error(`request failed`));

  const { result } = renderHook(() =>
    useImageUploader({ onUploadComplete, onUploadError }),
  );

  await act(async () => {
    await result.current.uploadImageBlob({
      blob: new Blob([`x`], { type: `image/png` }),
      contentType: `image/png`,
    });
  });

  expect(setCacheMock).toHaveBeenCalledWith(
    assetId,
    expect.objectContaining({ kind: `pending` }),
  );
  expect(clearCacheMock).toHaveBeenCalledWith(assetId);
  expect(onUploadError).toHaveBeenCalledWith(`request failed`);
  expect(onUploadComplete).not.toHaveBeenCalled();
});

test(`does not clear pending cache on successful upload flow`, async () => {
  const useImageUploader = await importUseImageUploader();
  const onUploadComplete = vi.fn();
  const onUploadError = vi.fn();
  const assetId = `sha256/asset-image-id`;

  getArrayBufferAssetIdMock.mockResolvedValue(assetId);
  setCacheMock.mockResolvedValue(undefined);
  clearCacheMock.mockResolvedValue(undefined);
  requestUploadUrlMutateAsync.mockResolvedValue({
    uploadUrl: `https://example.com/upload`,
  });
  confirmUploadMutateAsync.mockResolvedValue({ success: true });

  vi.spyOn(globalThis, `fetch`).mockResolvedValue({
    ok: true,
    statusText: `OK`,
  } as Response);

  const { result } = renderHook(() =>
    useImageUploader({ onUploadComplete, onUploadError }),
  );

  await act(async () => {
    await result.current.uploadImageBlob({
      blob: new Blob([`x`], { type: `image/png` }),
      contentType: `image/png`,
    });
  });

  expect(setCacheMock).toHaveBeenNthCalledWith(
    1,
    assetId,
    expect.objectContaining({ kind: `pending` }),
  );
  expect(setCacheMock).toHaveBeenNthCalledWith(
    2,
    assetId,
    expect.objectContaining({ kind: `uploaded` }),
  );
  expect(clearCacheMock).not.toHaveBeenCalled();
  expect(onUploadComplete).toHaveBeenCalledWith(assetId);
  expect(onUploadError).not.toHaveBeenCalled();
});
