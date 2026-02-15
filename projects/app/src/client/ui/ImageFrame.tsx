import { useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { AssetImage } from "./AssetImage";
import type { ImageCrop } from "./imageCrop";

interface FramedAssetImageProps {
  assetId: string;
  crop?: ImageCrop | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  className?: string;
}

export function FramedAssetImage({
  assetId,
  crop,
  imageWidth,
  imageHeight,
  className,
}: FramedAssetImageProps) {
  const [frameSize, setFrameSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const hasCropData =
    crop?.kind === `rect` && imageWidth != null && imageHeight != null;

  if (!hasCropData) {
    return <AssetImage assetId={assetId} className={className} />;
  }

  const rect = crop.rect;
  const wrapperClassName = `relative overflow-hidden ${className ?? ``}`.trim();

  return (
    <View
      className={wrapperClassName}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width <= 0 || height <= 0) {
          return;
        }
        setFrameSize({ width, height });
      }}
    >
      {frameSize == null ? (
        <AssetImage assetId={assetId} className="size-full" />
      ) : (
        (() => {
          const rectWidthPx = rect.width * imageWidth;
          const rectHeightPx = rect.height * imageHeight;
          const scaleX =
            rectWidthPx === 0 ? 1 : frameSize.width / Math.max(rectWidthPx, 1);
          const scaleY =
            rectHeightPx === 0
              ? 1
              : frameSize.height / Math.max(rectHeightPx, 1);
          const scale = Math.max(scaleX, scaleY);

          const scaledWidth = Math.round(imageWidth * scale);
          const scaledHeight = Math.round(imageHeight * scale);
          const styleWidth = scaledWidth;
          const styleHeight = scaledHeight;
          const translateX = Math.round(-rect.x * imageWidth * scale);
          const translateY = Math.round(-rect.y * imageHeight * scale);

          return (
            <AssetImage
              assetId={assetId}
              className={`absolute left-0 top-0`}
              contentFit={`fill`}
              style={{
                width: styleWidth,
                height: styleHeight,
                transform: [{ translateX }, { translateY }],
              }}
            />
          );
        })()
      )}
    </View>
  );
}
