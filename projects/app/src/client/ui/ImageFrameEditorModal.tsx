import {
  getLocalImageAssetSource,
  isLocalImageAssetId,
} from "@/client/assets/localImageAssets";
import { trpc } from "@/client/trpc";
import { useRizzleQuery } from "@/client/ui/hooks/useRizzleQuery";
import { AssetStatusKind } from "@/data/model";
import type { Rizzle } from "@/data/rizzleSchema";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Platform,
  Text,
  View,
} from "react-native";
import type {
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponderInstance,
  ViewStyle,
} from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { confirmDiscardChanges } from "./confirmDiscardChanges";
import {
  clampImageCropRectNormalized,
  parseImageCrop,
  resolveFrameAspectRatio,
} from "./imageCrop";
import type {
  ImageCrop,
  ImageCropRect,
  ImageFrameConstraintInput,
} from "./imageCrop";

interface ImageFrameEditorModalProps {
  assetId: string;
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
  const imageMeta = useAssetImageMeta(
    assetId,
    initialImageWidth,
    initialImageHeight,
  );
  const [cropRect, setCropRect] = useState<ImageCropRect | null>(null);
  const [initialRect, setInitialRect] = useState<ImageCropRect | null>(null);
  const initialAssetIdRef = useRef<string | null>(null);
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

    if (initialAssetIdRef.current !== assetId) {
      initialAssetIdRef.current = assetId;
      setCropRect(null);
      setInitialRect(defaultCropRect);
      return;
    }

    if (initialRect == null) {
      setInitialRect(defaultCropRect);
    }
  }, [assetId, defaultCropRect, initialRect]);

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
            </View>

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

              const minSizePx = getMinCropSizePx(currentImageSize);
              const nextPx = resizeRectPx(
                startPx,
                handle,
                dxPx,
                dyPx,
                currentAspectRatio,
                currentImageSize,
                minSizePx,
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

type CornerHandle = `topLeft` | `topRight` | `bottomLeft` | `bottomRight`;

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

function useAssetImageMeta(
  assetId: string,
  initialImageWidth?: number | null,
  initialImageHeight?: number | null,
): {
  status: `loading` | `ready` | `error`;
  imageSize: { width: number; height: number } | null;
  imageSource: EditorImageSource | null;
} {
  const { data: asset } = useRizzleQuery<NonNullable<
    Awaited<ReturnType<Rizzle[`query`][`asset`][`get`]>>
  > | null>(
    [`asset`, assetId],
    async (r, tx) => (await r.query.asset.get(tx, { assetId })) ?? null,
  );

  const [localSource, setLocalSource] = useState<Awaited<
    ReturnType<typeof getLocalImageAssetSource>
  > | null>(null);
  const [localSourceChecked, setLocalSourceChecked] = useState(false);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(
    initialImageWidth != null && initialImageHeight != null
      ? { width: initialImageWidth, height: initialImageHeight }
      : null,
  );

  const isLocalAsset = isLocalImageAssetId(assetId);
  const shouldFetchAssetKey =
    !isLocalAsset && asset?.status === AssetStatusKind.Uploaded;
  const assetKeyQuery = trpc.asset.getAssetKey.useQuery(
    { assetId },
    {
      enabled: shouldFetchAssetKey,
    },
  );

  const hasClearedLocalRef = useRef(false);
  useEffect(() => {
    if (hasClearedLocalRef.current) {
      return;
    }

    hasClearedLocalRef.current = true;
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLocalSource(null);
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLocalSourceChecked(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const source = await getLocalImageAssetSource(assetId);
      if (cancelled) {
        return;
      }
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setLocalSource(source ?? null);
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setLocalSourceChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    if (imageSize != null) {
      return;
    }

    if (localSource != null) {
      if (typeof Image.resolveAssetSource === `function`) {
        const resolved = Image.resolveAssetSource(
          localSource as Parameters<typeof Image.resolveAssetSource>[0],
        );
        if (resolved.width != null && resolved.height != null) {
          // oxlint-disable-next-line react-hooks-js/set-state-in-effect
          setImageSize({ width: resolved.width, height: resolved.height });
        }
        return;
      }

      const localSourceUri =
        typeof localSource === `string`
          ? localSource
          : typeof localSource === `object` &&
              localSource != null &&
              `uri` in localSource &&
              typeof (localSource as { uri?: unknown }).uri === `string`
            ? (localSource as { uri: string }).uri
            : null;

      if (localSourceUri != null) {
        Image.getSize(
          localSourceUri,
          (width, height) => {
            setImageSize({ width, height });
          },
          () => {
            setImageSize(null);
          },
        );
      }

      return;
    }

    const baseUrl = process.env.EXPO_PUBLIC_ASSETS_CDN_BASE_URL;
    const assetKey = assetKeyQuery.data?.assetKey;
    if (baseUrl == null || assetKey == null) {
      return;
    }

    const imageUrl = `${baseUrl}${assetKey}`;
    Image.getSize(
      imageUrl,
      (width, height) => {
        setImageSize({ width, height });
      },
      () => {
        setImageSize(null);
      },
    );
  }, [assetKeyQuery.data?.assetKey, imageSize, localSource]);

  if (localSource != null) {
    return {
      status: imageSize == null ? `loading` : `ready`,
      imageSize,
      imageSource: localSource as ImageSourcePropType,
    };
  }

  if (isLocalAsset && !localSourceChecked) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  if (asset == null) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  if (asset.status === AssetStatusKind.Failed) {
    return { status: `error`, imageSize: null, imageSource: null };
  }

  if (asset.status === AssetStatusKind.Pending) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  if (imageSize == null) {
    return { status: `loading`, imageSize: null, imageSource: null };
  }

  const baseUrl = process.env.EXPO_PUBLIC_ASSETS_CDN_BASE_URL;
  const assetKey = assetKeyQuery.data?.assetKey;
  const imageSource =
    baseUrl != null && assetKey != null
      ? ({ uri: `${baseUrl}${assetKey}` } satisfies EditorImageSource)
      : null;

  if (imageSource == null) {
    return { status: `loading`, imageSize, imageSource: null };
  }

  return { status: `ready`, imageSize, imageSource };
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

function createCenteredCropRect(
  imageWidth: number,
  imageHeight: number,
  frameAspectRatio: number | null,
): ImageCropRect {
  if (frameAspectRatio == null || imageWidth === 0 || imageHeight === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const imageAspectRatio = imageWidth / imageHeight;

  if (imageAspectRatio > frameAspectRatio) {
    const width = frameAspectRatio / imageAspectRatio;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }

  const height = imageAspectRatio / frameAspectRatio;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
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

function clampRectPx(
  rectPx: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number },
  minSizePx: number,
) {
  const width = clamp(rectPx.width, minSizePx, imageSize.width);
  const height = clamp(rectPx.height, minSizePx, imageSize.height);
  const x = clamp(rectPx.x, 0, imageSize.width - width);
  const y = clamp(rectPx.y, 0, imageSize.height - height);

  return { x, y, width, height };
}

function resizeRectPx(
  rectPx: { x: number; y: number; width: number; height: number },
  handle: CornerHandle,
  dxPx: number,
  dyPx: number,
  frameAspectRatio: number | null,
  imageSize: { width: number; height: number },
  minSizePx: number,
) {
  let x = rectPx.x;
  let y = rectPx.y;
  let width = rectPx.width;
  let height = rectPx.height;

  if (handle === `topLeft` || handle === `bottomLeft`) {
    x += dxPx;
    width -= dxPx;
  } else {
    width += dxPx;
  }

  if (handle === `topLeft` || handle === `topRight`) {
    y += dyPx;
    height -= dyPx;
  } else {
    height += dyPx;
  }

  if (frameAspectRatio != null) {
    const useWidth = Math.abs(dxPx) >= Math.abs(dyPx);
    if (useWidth) {
      width = clamp(width, minSizePx, imageSize.width);
      height = width / frameAspectRatio;
    } else {
      height = clamp(height, minSizePx, imageSize.height);
      width = height * frameAspectRatio;
    }

    if (handle === `topLeft` || handle === `bottomLeft`) {
      x = rectPx.x + (rectPx.width - width);
    }
    if (handle === `topLeft` || handle === `topRight`) {
      y = rectPx.y + (rectPx.height - height);
    }
  }

  return clampRectPx({ x, y, width, height }, imageSize, minSizePx);
}

function clamp(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getMinCropSizePx(imageSize: { width: number; height: number }) {
  return Math.max(40, Math.min(imageSize.width, imageSize.height) * 0.05);
}
