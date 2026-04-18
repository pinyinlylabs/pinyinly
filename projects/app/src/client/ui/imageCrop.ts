export interface ImageCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ImageCropKind = `none` | `rect`;

export type ImageCrop =
  | { kind: `none` }
  | { kind: `rect`; rect: ImageCropRect };

export type ImageFrameShape = `rect` | `circle`;

// Pixel-space types for crop geometry calculations
export type CornerHandle =
  | `topLeft`
  | `topRight`
  | `bottomLeft`
  | `bottomRight`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export function parseImageCrop(value: unknown): ImageCrop {
  if (value == null) {
    return { kind: `none` };
  }

  if (isImageCropRect(value)) {
    return { kind: `rect`, rect: clampImageCropRectNormalized(value) };
  }

  if (typeof value === `object`) {
    const record = value as Record<string, unknown>;
    if (record[`kind`] === `none`) {
      return { kind: `none` };
    }
    if (record[`kind`] === `rect` && isImageCropRect(record[`rect`])) {
      return {
        kind: `rect`,
        rect: clampImageCropRectNormalized(record[`rect`]),
      };
    }
  }

  return { kind: `none` };
}

export function imageCropValueFromCrop(
  crop: ImageCrop | null | undefined,
): ImageCropRect | undefined {
  if (crop?.kind !== `rect`) {
    return undefined;
  }

  return crop.rect;
}

export function clampImageCropRectNormalized(
  rect: ImageCropRect,
): ImageCropRect {
  const x = clamp01(rect.x);
  const y = clamp01(rect.y);
  const width = clamp01(rect.width);
  const height = clamp01(rect.height);

  const clampedWidth = Math.min(width, 1 - x);
  const clampedHeight = Math.min(height, 1 - y);

  return {
    x,
    y,
    width: clampedWidth,
    height: clampedHeight,
  };
}

export function isImageCropRect(value: unknown): value is ImageCropRect {
  if (value == null || typeof value !== `object`) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isFiniteNumber(record[`x`]) &&
    isFiniteNumber(record[`y`]) &&
    isFiniteNumber(record[`width`]) &&
    isFiniteNumber(record[`height`])
  );
}

export function createCenteredCropRect(
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

/**
 * Clamps a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculates the minimum crop size based on image dimensions.
 * Returns the larger of 40px or 5% of the smallest image dimension.
 */
export function getMinCropSizePx(imageSize: Size): number {
  return Math.max(40, Math.min(imageSize.width, imageSize.height) * 0.05);
}

/**
 * Clamps a rectangle to stay within image bounds and respect minimum size.
 */
export function clampRectPx(
  rectPx: Rect,
  imageSize: Size,
  minSizePx: number,
): Rect {
  const width = clamp(rectPx.width, minSizePx, imageSize.width);
  const height = clamp(rectPx.height, minSizePx, imageSize.height);
  const x = clamp(rectPx.x, 0, imageSize.width - width);
  const y = clamp(rectPx.y, 0, imageSize.height - height);

  return { x, y, width, height };
}

/**
 * Applies corner-specific position and size deltas to a rectangle.
 * This updates the position based on which corner is being dragged.
 */
export function applyCornerDelta(
  rectPx: Rect,
  handle: CornerHandle,
  dxPx: number,
  dyPx: number,
): Rect {
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

  return { x, y, width, height };
}

/**
 * Enforces aspect ratio by recomputing one dimension based on the other.
 * Uses horizontal movement (dx) as the driving dimension on web.
 * On native, uses whichever delta is larger.
 * Ensures both dimensions meet the minimum size constraint while maintaining the aspect ratio.
 */
export function enforceAspectRatio(
  rectPx: Rect,
  handle: CornerHandle,
  dxPx: number,
  dyPx: number,
  frameAspectRatio: number,
  minSizePx: number,
  imageSize: Size,
  isWeb: boolean,
): Rect {
  let { x, y, width, height } = rectPx;

  // On web, always use width as driving dimension (horizontal-only scaling)
  // On native, use whichever delta is larger
  const useWidth = isWeb || Math.abs(dxPx) >= Math.abs(dyPx);

  if (useWidth) {
    width = clamp(width, minSizePx, imageSize.width);
    height = width / frameAspectRatio;
    // Ensure height also meets minimum size; if not, adjust width accordingly
    if (height < minSizePx) {
      height = minSizePx;
      width = height * frameAspectRatio;
    }
  } else {
    height = clamp(height, minSizePx, imageSize.height);
    width = height * frameAspectRatio;
    // Ensure width also meets minimum size; if not, adjust height accordingly
    if (width < minSizePx) {
      width = minSizePx;
      height = width / frameAspectRatio;
    }
  }

  // Clamp to image bounds to handle cases where enforced dimensions exceed image size
  width = clamp(width, minSizePx, imageSize.width);
  height = clamp(height, minSizePx, imageSize.height);

  // Adjust position to anchor from opposite corner
  if (handle === `topLeft` || handle === `bottomLeft`) {
    x = rectPx.x + (rectPx.width - width);
  }
  if (handle === `topLeft` || handle === `topRight`) {
    y = rectPx.y + (rectPx.height - height);
  }

  return { x, y, width, height };
}

/**
 * Resizes a crop rectangle by dragging a corner handle with optional aspect ratio enforcement.
 *
 * @param rectPx - The current crop rectangle in pixels
 * @param handle - Which corner is being dragged
 * @param dxPx - Horizontal delta in pixels
 * @param dyPx - Vertical delta in pixels
 * @param frameAspectRatio - Desired aspect ratio (width/height), or null for no constraint
 * @param imageSize - Image dimensions in pixels
 * @param isWeb - Whether running on web platform (affects aspect ratio enforcement)
 * @returns The new rectangle after resizing and clamping
 */
export function resizeRectPx(
  rectPx: Rect,
  handle: CornerHandle,
  dxPx: number,
  dyPx: number,
  frameAspectRatio: number | null,
  imageSize: Size,
  isWeb: boolean,
): Rect {
  const minSizePx = getMinCropSizePx(imageSize);

  // Apply corner-specific deltas
  let result = applyCornerDelta(rectPx, handle, dxPx, dyPx);

  // Enforce aspect ratio if specified
  if (frameAspectRatio != null) {
    result = enforceAspectRatio(
      result,
      handle,
      dxPx,
      dyPx,
      frameAspectRatio,
      minSizePx,
      imageSize,
      isWeb,
    );
  }

  // Clamp to image bounds and minimum size
  return clampRectPx(result, imageSize, minSizePx);
}

/**
 * Clamps a normalized crop rectangle position while preserving size.
 * Ensures the rectangle stays within 0-1 bounds.
 */
export function clampImageCropRectPosition(rect: ImageCropRect): ImageCropRect {
  const width = clamp(rect.width, 0, 1);
  const height = clamp(rect.height, 0, 1);
  const maxX = Math.max(0, 1 - width);
  const maxY = Math.max(0, 1 - height);
  const x = clamp(rect.x, 0, maxX);
  const y = clamp(rect.y, 0, maxY);

  return { x, y, width, height };
}

/**
 * Checks if a normalized crop rectangle matches the specified aspect ratio within tolerance.
 */
export function isImageCropRectAspectRatioCompatible(
  rect: ImageCropRect,
  frameAspectRatio: number | null,
): boolean {
  if (frameAspectRatio == null) {
    return true;
  }

  if (rect.height <= 0 || rect.width <= 0) {
    return false;
  }

  const rectRatio = rect.width / rect.height;
  return Math.abs(rectRatio - frameAspectRatio) <= 0.01;
}

/**
 * Calculates the scale factor needed to fit a cropped region into a frame.
 * Used for positioning and scaling images within frames.
 */
export function getImageScale(
  frameSize: { width: number; height: number },
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
): number {
  const rectWidthPx = rect.width * imageSize.width;
  const rectHeightPx = rect.height * imageSize.height;
  const scaleX = rectWidthPx <= 0 ? 1 : frameSize.width / rectWidthPx;
  const scaleY = rectHeightPx <= 0 ? 1 : frameSize.height / rectHeightPx;
  return Math.max(scaleX, scaleY);
}

/**
 * Converts a normalized crop rectangle to pixel coordinates.
 */
export function imageCropRectToPx(
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x * imageSize.width,
    y: rect.y * imageSize.height,
    width: rect.width * imageSize.width,
    height: rect.height * imageSize.height,
  };
}

/**
 * Converts pixel coordinates to a normalized crop rectangle.
 * Automatically clamps to valid normalized range.
 */
export function imageCropRectFromPx(
  rectPx: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number },
): ImageCropRect {
  return clampImageCropRectPosition({
    x: rectPx.x / imageSize.width,
    y: rectPx.y / imageSize.height,
    width: rectPx.width / imageSize.width,
    height: rectPx.height / imageSize.height,
  });
}

/**
 * Zooms a normalized crop rectangle by a factor while maintaining center position.
 * Respects aspect ratio constraints and image bounds.
 */
export function getZoomedImageCropRect(
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
  frameAspectRatio: number | null,
  zoomFactor: number,
): ImageCropRect {
  const rectPx = imageCropRectToPx(rect, imageSize);
  const centerX = rectPx.x + rectPx.width / 2;
  const centerY = rectPx.y + rectPx.height / 2;
  const minSizePx = getMinCropSizePx(imageSize);

  let nextWidth = rectPx.width * zoomFactor;
  let nextHeight = rectPx.height * zoomFactor;

  if (frameAspectRatio == null) {
    nextWidth = clamp(nextWidth, minSizePx, imageSize.width);
    nextHeight = clamp(nextHeight, minSizePx, imageSize.height);
  } else {
    nextWidth = clamp(nextWidth, minSizePx, imageSize.width);
    nextHeight = nextWidth / frameAspectRatio;

    if (nextHeight > imageSize.height) {
      nextHeight = imageSize.height;
      nextWidth = nextHeight * frameAspectRatio;
    }

    if (nextHeight < minSizePx) {
      nextHeight = minSizePx;
      nextWidth = nextHeight * frameAspectRatio;
    }

    if (nextWidth > imageSize.width) {
      nextWidth = imageSize.width;
      nextHeight = nextWidth / frameAspectRatio;
    }
  }

  const nextRectPx = clampRectPx(
    {
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
      width: nextWidth,
      height: nextHeight,
    },
    imageSize,
    minSizePx,
  );

  return imageCropRectFromPx(nextRectPx, imageSize);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === `number` && Number.isFinite(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}
