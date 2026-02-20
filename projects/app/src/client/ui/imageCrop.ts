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

export interface ImageFrameConstraintInput {
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export function resolveFrameAspectRatio(
  constraint: ImageFrameConstraintInput | null | undefined,
): number | null {
  if (constraint == null) {
    return null;
  }

  if (isFiniteNumber(constraint.aspectRatio) && constraint.aspectRatio > 0) {
    return constraint.aspectRatio;
  }

  if (isFiniteNumber(constraint.width) && isFiniteNumber(constraint.height)) {
    if (constraint.height === 0) {
      return null;
    }

    return constraint.width / constraint.height;
  }

  return null;
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
