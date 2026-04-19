// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, test, vi } from "vitest";
import { useImageDropTarget } from "#client/ui/hooks/useImageDropTarget.ts";

function createImageFile({
  name = `image.png`,
  type = `image/png`,
}: {
  name?: string;
  type?: string;
} = {}): File {
  return new File([`img`], name, { type });
}

function createDataTransferStub(files: File[]): DataTransfer {
  const items = files.map((file) => ({
    kind: `file`,
    type: file.type,
    getAsFile: () => file,
  }));

  return {
    files,
    items,
    types: [`Files`],
    dropEffect: `none`,
  } as unknown as DataTransfer;
}

function dispatchDragEvent(
  element: HTMLElement,
  type: string,
  dataTransfer: DataTransfer,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, `dataTransfer`, {
    value: dataTransfer,
    configurable: true,
  });
  element.dispatchEvent(event);
  return event;
}

describe(`useImageDropTarget`, () => {
  test(`sets drag over state on enter and clears on leave`, () => {
    const onUploadImage = vi.fn();
    const { result } = renderHook(() =>
      useImageDropTarget({ disabled: false, onUploadImage }),
    );

    const target = document.createElement(`div`);
    const dataTransfer = createDataTransferStub([createImageFile()]);

    act(() => {
      result.current.imageDropTargetRef(target as never);
    });

    expect(result.current.isImageDragOver).toBe(false);

    act(() => {
      dispatchDragEvent(target, `dragenter`, dataTransfer);
    });

    expect(result.current.isImageDragOver).toBe(true);

    act(() => {
      dispatchDragEvent(target, `dragleave`, dataTransfer);
    });

    expect(result.current.isImageDragOver).toBe(false);
  });

  test(`uploads first image file on drop when enabled`, () => {
    const onUploadImage = vi.fn();
    const { result } = renderHook(() =>
      useImageDropTarget({ disabled: false, onUploadImage }),
    );

    const target = document.createElement(`div`);
    const imageFile = createImageFile();
    const dataTransfer = createDataTransferStub([imageFile]);

    act(() => {
      result.current.imageDropTargetRef(target as never);
    });

    act(() => {
      dispatchDragEvent(target, `drop`, dataTransfer);
    });

    expect(onUploadImage).toHaveBeenCalledTimes(1);
    expect(onUploadImage).toHaveBeenCalledWith({
      blob: imageFile,
      contentType: `image/png`,
    });
    expect(result.current.isImageDragOver).toBe(false);
  });

  test(`does not upload when disabled`, () => {
    const onUploadImage = vi.fn();
    const { result } = renderHook(() =>
      useImageDropTarget({ disabled: true, onUploadImage }),
    );

    const target = document.createElement(`div`);
    const dataTransfer = createDataTransferStub([createImageFile()]);

    act(() => {
      result.current.imageDropTargetRef(target as never);
    });

    act(() => {
      dispatchDragEvent(target, `drop`, dataTransfer);
    });

    expect(onUploadImage).not.toHaveBeenCalled();
  });

  test(`detaches listeners from previous element when ref is rebound`, () => {
    const onUploadImage = vi.fn();
    const { result } = renderHook(() =>
      useImageDropTarget({ disabled: false, onUploadImage }),
    );

    const firstTarget = document.createElement(`div`);
    const secondTarget = document.createElement(`div`);
    const dataTransfer = createDataTransferStub([createImageFile()]);

    act(() => {
      result.current.imageDropTargetRef(firstTarget as never);
      result.current.imageDropTargetRef(secondTarget as never);
    });

    act(() => {
      dispatchDragEvent(firstTarget, `drop`, dataTransfer);
    });

    expect(onUploadImage).toHaveBeenCalledTimes(0);

    act(() => {
      dispatchDragEvent(secondTarget, `drop`, dataTransfer);
    });

    expect(onUploadImage).toHaveBeenCalledTimes(1);
  });
});
