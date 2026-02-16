/**
 * Pure, testable crop frame calculation functions.
 * These functions are extracted from ImageFrameEditorModal for improved testability.
 */

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
