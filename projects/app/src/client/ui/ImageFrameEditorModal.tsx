import { trpc } from "@/client/trpc";
import type { AssetId } from "@/data/model";
import { useEffect, useRef, useState } from "react";
import type {
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponderInstance,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Platform,
  Text,
  View,
} from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { confirmDiscardChanges } from "./confirmDiscardChanges";
import type {
  ImageCrop,
  ImageCropRect,
  ImageFrameConstraintInput,
} from "./imageCrop";
import {
  clampImageCropRectNormalized,
  createCenteredCropRect,
  parseImageCrop,
  resolveFrameAspectRatio,
} from "./imageCrop";
import type { CornerHandle } from "./imageCropCalc";
import { clampRectPx, getMinCropSizePx, resizeRectPx } from "./imageCropCalc";
import { useAssetImageMeta } from "./useAssetImageMeta";

interface ImageFrameEditorModalProps {
  assetId: AssetId;
  frameConstraint?: ImageFrameConstraintInput | null;
  initialCrop?: ImageCrop | null;
  initialImageWidth?: number | null;
  initialImageHeight?: number | null;
  title?: string;
  onDismiss: () => void;
  onSave: (result: {
    crop: ImageCrop;
    imageWidth: number;
    imageHeight: number;
  }) => void;
}

type EditorImageSource = ImageSourcePropType;

export function ImageFrameEditorModal({
  assetId,
  frameConstraint,
  initialCrop,
  initialImageWidth,
  initialImageHeight,
  title = `Edit image`,
  onDismiss,
  onSave,
}: ImageFrameEditorModalProps) {
  const frameAspectRatio = resolveFrameAspectRatio(frameConstraint);
  const [cropRect, setCropRect] = useState<ImageCropRect | null>(null);
  const [initialRect, setInitialRect] = useState<ImageCropRect | null>(null);
  const [currentAssetId, setCurrentAssetId] = useState(assetId);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [removeBackgroundError, setRemoveBackgroundError] = useState<
    string | null
  >(null);
  const initialAssetIdRef = useRef<AssetId | null>(null);

  const removeBackgroundMutation = trpc.ai.removeBackground.useMutation();

  const imageMeta = useAssetImageMeta(
    currentAssetId,
    initialImageWidth,
    initialImageHeight,
  );
  const defaultCropRect =
    imageMeta.imageSize == null
      ? null
      : (() => {
          const parsed = parseImageCrop(initialCrop ?? null);
          return parsed.kind === `rect`
            ? clampImageCropRectNormalized(parsed.rect)
            : createCenteredCropRect(
                imageMeta.imageSize.width,
                imageMeta.imageSize.height,
                frameAspectRatio,
              );
        })();
  const effectiveCropRect = cropRect ?? defaultCropRect;

  useEffect(() => {
    if (defaultCropRect == null) {
      return;
    }

    if (initialAssetIdRef.current !== currentAssetId) {
      initialAssetIdRef.current = currentAssetId;
      setCropRect(null);
      setInitialRect(defaultCropRect);
      return;
    }

    if (initialRect == null) {
      setInitialRect(defaultCropRect);
    }
  }, [currentAssetId, defaultCropRect, initialRect]);

  const isDirty =
    initialRect != null &&
    effectiveCropRect != null &&
    !areRectsClose(initialRect, effectiveCropRect);

  const handleDismissRequest = (dismiss: () => void) => {
    if (!isDirty) {
      dismiss();
      return;
    }

    confirmDiscardChanges({ onDiscard: dismiss });
  };

  const handleRemoveBackground = async () => {
    setIsRemovingBackground(true);
    setRemoveBackgroundError(null);

    try {
      const result = await removeBackgroundMutation.mutateAsync({
        assetId: currentAssetId,
      });

      if (result.assetId != null) {
        setCurrentAssetId(result.assetId);
        setCropRect(null);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `Failed to remove background`;
      setRemoveBackgroundError(errorMessage);
      console.error(`Background removal error:`, error);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  return (
    <PageSheetModal
      onDismiss={onDismiss}
      onDismissRequest={handleDismissRequest}
      suspenseFallback={<Text>Loading...</Text>}
    >
      {({ dismiss }) => (
        <View className="flex-1 bg-bg">
          <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
            <RectButton variant="bare" onPress={dismiss}>
              Cancel
            </RectButton>
            <Text className="text-[17px] font-semibold text-fg-loud">
              {title}
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                if (imageMeta.imageSize == null || effectiveCropRect == null) {
                  return;
                }
                onSave({
                  crop: { kind: `rect`, rect: effectiveCropRect },
                  imageWidth: imageMeta.imageSize.width,
                  imageHeight: imageMeta.imageSize.height,
                });
                dismiss();
              }}
              disabled={
                imageMeta.imageSize == null || effectiveCropRect == null
              }
            >
              Save
            </RectButton>
          </View>

          <View className="flex-1">
            <View className="gap-3 p-4">
              <Text className="text-[14px] text-fg-dim">
                Drag the frame to reposition. Drag a corner to resize.
              </Text>
              {removeBackgroundError == null ? null : (
                <Text className="text-[12px] text-red">
                  Background removal failed: {removeBackgroundError}
                </Text>
              )}
            </View>

            {isRemovingBackground ? (
              <View
                className={`
                  flex-row items-center justify-center gap-2 border-t border-fg/10 px-4 py-3
                `}
              >
                <ActivityIndicator size="small" className="text-fg" />
                <Text className="text-[14px] text-fg-dim">
                  Removing background...
                </Text>
              </View>
            ) : (
              <View className="border-t border-fg/10 px-4 py-2">
                <RectButton
                  variant="outline"
                  onPress={() => {
                    void handleRemoveBackground();
                  }}
                  disabled={
                    imageMeta.status !== `ready` || currentAssetId == null
                  }
                  className="py-2"
                >
                  Remove Background
                </RectButton>
              </View>
            )}

            <View className="flex-1 px-4">
              {imageMeta.status === `ready` &&
              imageMeta.imageSize != null &&
              imageMeta.imageSource != null ? (
                effectiveCropRect == null ? null : (
                  <ImageFrameEditor
                    imageSource={imageMeta.imageSource}
                    frameAspectRatio={frameAspectRatio}
                    imageSize={imageMeta.imageSize}
                    cropRect={effectiveCropRect}
                    onCropRectChange={setCropRect}
                  />
                )
              ) : (
                <View
                  className={`
                    flex-1 items-center justify-center rounded-xl border border-fg/10 bg-fg-bg5
                  `}
                >
                  <ActivityIndicator size="small" className="text-fg" />
                  <Text className="mt-2 text-[12px] text-fg-dim">
                    {imageMeta.status === `error`
                      ? `Failed to load image`
                      : `Loading image`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </PageSheetModal>
  );
}

const cornerHandles: CornerHandle[] = [
  `topLeft`,
  `topRight`,
  `bottomLeft`,
  `bottomRight`,
];

function ImageFrameEditor({
  imageSource,
  frameAspectRatio,
  imageSize,
  cropRect,
  onCropRectChange,
}: {
  imageSource: EditorImageSource;
  frameAspectRatio: number | null;
  imageSize: { width: number; height: number };
  cropRect: ImageCropRect;
  onCropRectChange: (rect: ImageCropRect) => void;
}) {
  const [editorSize, setEditorSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const cropRectRef = useRef<ImageCropRect>(cropRect);
  const imageSizeRef = useRef(imageSize);
  const frameAspectRatioRef = useRef(frameAspectRatio);

  const imageAspectRatio =
    imageSize.height === 0 ? 1 : imageSize.width / imageSize.height;

  const editorWidth = editorSize?.width ?? 0;
  const editorHeight = editorSize?.height ?? 0;
  const displaySize = getContainSize(
    editorWidth,
    editorHeight,
    imageAspectRatio,
  );
  const displaySizeRef = useRef(displaySize);
  useEffect(() => {
    cropRectRef.current = cropRect;
    imageSizeRef.current = imageSize;
    frameAspectRatioRef.current = frameAspectRatio;
    displaySizeRef.current = displaySize;
  }, [cropRect, displaySize, frameAspectRatio, imageSize]);
  const displayOffsetX = (editorWidth - displaySize.width) / 2;
  const displayOffsetY = (editorHeight - displaySize.height) / 2;

  const overlay = rectToDisplayRect(cropRect, imageSize, displaySize, {
    x: displayOffsetX,
    y: displayOffsetY,
  });

  const startRectRef = useRef<ImageCropRect | null>(null);
  const [moveResponder, setMoveResponder] =
    useState<PanResponderInstance | null>(null);

  const [resizeResponders, setResizeResponders] = useState<Record<
    CornerHandle,
    PanResponderInstance
  > | null>(null);

  useEffect(() => {
    if (moveResponder != null && resizeResponders != null) {
      return;
    }

    const nextMoveResponder =
      moveResponder ??
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: () => {
          startRectRef.current = cropRectRef.current;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, gestureState) => {
          const startRect = startRectRef.current;
          const currentDisplaySize = displaySizeRef.current;
          const currentImageSize = imageSizeRef.current;
          if (
            startRect == null ||
            currentDisplaySize.width === 0 ||
            currentDisplaySize.height === 0
          ) {
            return;
          }

          const dxPx =
            (gestureState.dx / currentDisplaySize.width) *
            currentImageSize.width;
          const dyPx =
            (gestureState.dy / currentDisplaySize.height) *
            currentImageSize.height;

          const startPx = rectToPx(startRect, currentImageSize);
          const nextPx = {
            x: startPx.x + dxPx,
            y: startPx.y + dyPx,
            width: startPx.width,
            height: startPx.height,
          };
          const minSizePx = getMinCropSizePx(currentImageSize);
          const clamped = clampRectPx(nextPx, currentImageSize, minSizePx);
          onCropRectChange(rectFromPx(clamped, currentImageSize));
        },
      });

    const nextResizeResponders =
      resizeResponders ??
      (() => {
        const responders = {} as Record<CornerHandle, PanResponderInstance>;
        for (const handle of cornerHandles) {
          responders[handle] = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderGrant: () => {
              startRectRef.current = cropRectRef.current;
            },
            onPanResponderTerminationRequest: () => false,
            onPanResponderMove: (_event, gestureState) => {
              const startRect = startRectRef.current;
              const currentDisplaySize = displaySizeRef.current;
              const currentImageSize = imageSizeRef.current;
              const currentAspectRatio = frameAspectRatioRef.current;
              if (
                startRect == null ||
                currentDisplaySize.width === 0 ||
                currentDisplaySize.height === 0
              ) {
                return;
              }

              const dxPx =
                (gestureState.dx / currentDisplaySize.width) *
                currentImageSize.width;
              const dyPx =
                (gestureState.dy / currentDisplaySize.height) *
                currentImageSize.height;
              const startPx = rectToPx(startRect, currentImageSize);

              const nextPx = resizeRectPx(
                startPx,
                handle,
                dxPx,
                dyPx,
                currentAspectRatio,
                currentImageSize,
                Platform.OS === `web`,
              );

              onCropRectChange(rectFromPx(nextPx, currentImageSize));
            },
          });
        }
        return responders;
      })();

    if (moveResponder == null) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setMoveResponder(nextMoveResponder);
    }

    if (resizeResponders == null) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setResizeResponders(nextResizeResponders);
    }
  }, [moveResponder, onCropRectChange, resizeResponders]);

  const overlayClassName = `absolute left-0 top-0`;

  return (
    <View
      className={`w-full overflow-hidden rounded-xl border border-fg/10 bg-fg-bg5`}
      style={{ height: 320 }}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width <= 0 || height <= 0) {
          return;
        }
        setEditorSize({ width, height });
      }}
    >
      <View
        className={overlayClassName}
        style={{
          width: editorWidth,
          height: editorHeight,
        }}
      >
        <Image
          source={imageSource}
          className={`absolute`}
          resizeMode="contain"
          style={{
            left: displayOffsetX,
            top: displayOffsetY,
            width: displaySize.width,
            height: displaySize.height,
          }}
        />

        <View className={`absolute left-0 top-0 size-full`}>
          <DimLayer
            editorWidth={editorWidth}
            editorHeight={editorHeight}
            cropRect={overlay}
          />
          <View
            className={`absolute rounded-md border-2 border-cyan`}
            style={[
              {
                left: overlay.x,
                top: overlay.y,
                width: overlay.width,
                height: overlay.height,
              },
              Platform.OS === `web`
                ? ({ touchAction: `none` } as ViewStyle)
                : null,
            ]}
            {...(moveResponder?.panHandlers ?? {})}
          >
            {cornerHandles.map((handle) => (
              <CornerHandleView
                key={handle}
                position={handle}
                responder={resizeResponders?.[handle] ?? null}
              />
            ))}
          </View>
        </View>
      </View>

      <View className="pt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] text-fg-dim">
            {frameAspectRatio == null
              ? `Free crop`
              : `Aspect ratio ${frameAspectRatio.toFixed(2)}:1`}
          </Text>
          <Text className="text-[12px] text-fg-dim">
            {imageSize.width}x{imageSize.height}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CornerHandleView({
  position,
  responder,
}: {
  position: CornerHandle;
  responder: PanResponderInstance | null;
}) {
  const positionClass =
    position === `topLeft`
      ? `left-[-8px] top-[-8px]`
      : position === `topRight`
        ? `right-[-8px] top-[-8px]`
        : position === `bottomLeft`
          ? `left-[-8px] bottom-[-8px]`
          : `right-[-8px] bottom-[-8px]`;

  return (
    <View
      className={`
        absolute size-4 rounded-full border border-cyan bg-bg

        ${positionClass}
      `}
      style={
        Platform.OS === `web`
          ? ({ touchAction: `none` } as ViewStyle)
          : undefined
      }
      {...(responder?.panHandlers ?? {})}
    />
  );
}

function DimLayer({
  editorWidth,
  editorHeight,
  cropRect,
}: {
  editorWidth: number;
  editorHeight: number;
  cropRect: { x: number; y: number; width: number; height: number };
}) {
  const right = cropRect.x + cropRect.width;
  const bottom = cropRect.y + cropRect.height;

  return (
    <>
      <View
        className="absolute left-0 top-0 bg-[black]/45"
        style={{ width: editorWidth, height: cropRect.y }}
      />
      <View
        className="absolute left-0 bg-[black]/45"
        style={{
          top: cropRect.y,
          width: cropRect.x,
          height: cropRect.height,
        }}
      />
      <View
        className="absolute bg-[black]/45"
        style={{
          left: right,
          top: cropRect.y,
          width: Math.max(0, editorWidth - right),
          height: cropRect.height,
        }}
      />
      <View
        className="absolute left-0 bg-[black]/45"
        style={{
          top: bottom,
          width: editorWidth,
          height: Math.max(0, editorHeight - bottom),
        }}
      />
    </>
  );
}

function getContainSize(
  containerWidth: number,
  containerHeight: number,
  imageAspectRatio: number,
) {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const containerAspectRatio =
    containerHeight === 0 ? 1 : containerWidth / containerHeight;

  if (imageAspectRatio > containerAspectRatio) {
    return {
      width: containerWidth,
      height: containerWidth / imageAspectRatio,
    };
  }

  return {
    width: containerHeight * imageAspectRatio,
    height: containerHeight,
  };
}

function areRectsClose(a: ImageCropRect, b: ImageCropRect) {
  const epsilon = 0.0001;
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  );
}

function rectToDisplayRect(
  rect: ImageCropRect,
  _imageSize: { width: number; height: number },
  displaySize: { width: number; height: number },
  offset: { x: number; y: number },
) {
  return {
    x: offset.x + rect.x * displaySize.width,
    y: offset.y + rect.y * displaySize.height,
    width: rect.width * displaySize.width,
    height: rect.height * displaySize.height,
  };
}

function rectToPx(
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
) {
  return {
    x: rect.x * imageSize.width,
    y: rect.y * imageSize.height,
    width: rect.width * imageSize.width,
    height: rect.height * imageSize.height,
  };
}

function rectFromPx(
  rectPx: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number },
): ImageCropRect {
  return clampImageCropRectNormalized({
    x: rectPx.x / imageSize.width,
    y: rectPx.y / imageSize.height,
    width: rectPx.width / imageSize.width,
    height: rectPx.height / imageSize.height,
  });
}
