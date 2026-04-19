import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "react-native";

interface UseImageDropTargetProps {
  disabled: boolean;
  onUploadPastedImage: (input: {
    blob: Blob;
    contentType: string | null;
  }) => void;
}

interface UseImageDropTargetResult {
  imageDropTargetRef: (viewInstance: View | null) => void;
  isImageDragOver: boolean;
}

export function useImageDropTarget({
  disabled,
  onUploadPastedImage,
}: UseImageDropTargetProps): UseImageDropTargetResult {
  const [isDragOver, setIsDragOver] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const onUploadPastedImageRef = useRef(onUploadPastedImage);
  useEffect(() => {
    onUploadPastedImageRef.current = onUploadPastedImage;
  }, [onUploadPastedImage]);

  const targetRef = useCallback((viewInstance: View | null) => {
    cleanupRef.current?.();
    dragDepthRef.current = 0;
    setIsDragOver(false);

    if (typeof window === `undefined`) {
      return;
    }

    const dropTargetElement = viewInstance as unknown as HTMLElement | null;
    if (!(dropTargetElement instanceof HTMLElement)) {
      return;
    }

    const hasFilePayload = (event: DragEvent): boolean =>
      Array.from(event.dataTransfer?.types ?? []).includes(`Files`);

    const handleDragEnter = (event: DragEvent) => {
      dragDepthRef.current += 1;
      if (!hasFilePayload(event)) {
        return;
      }

      event.preventDefault();
      setIsDragOver(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!hasFilePayload(event)) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer != null) {
        event.dataTransfer.dropEffect = `copy`;
      }
    };

    const handleDragLeave = () => {
      dragDepthRef.current -= 1;
      if (dragDepthRef.current <= 0) {
        dragDepthRef.current = 0;
        setIsDragOver(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      dragDepthRef.current = 0;
      setIsDragOver(false);

      const files = event.dataTransfer?.files
        ? Array.from(event.dataTransfer.files)
        : [];
      const file = files.find((candidate) =>
        candidate.type.startsWith(`image/`),
      );

      if (file == null) {
        return;
      }

      event.preventDefault();

      if (disabledRef.current) {
        return;
      }

      onUploadPastedImageRef.current({ blob: file, contentType: file.type });
    };

    dropTargetElement.addEventListener(`dragenter`, handleDragEnter);
    dropTargetElement.addEventListener(`dragover`, handleDragOver);
    dropTargetElement.addEventListener(`dragleave`, handleDragLeave);
    dropTargetElement.addEventListener(`drop`, handleDrop);

    cleanupRef.current = () => {
      dragDepthRef.current = 0;
      setIsDragOver(false);
      dropTargetElement.removeEventListener(`dragenter`, handleDragEnter);
      dropTargetElement.removeEventListener(`dragover`, handleDragOver);
      dropTargetElement.removeEventListener(`dragleave`, handleDragLeave);
      dropTargetElement.removeEventListener(`drop`, handleDrop);
    };
  }, []);

  return {
    imageDropTargetRef: targetRef,
    isImageDragOver: isDragOver && !disabled,
  };
}
