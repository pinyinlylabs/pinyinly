export const geminiImageAspectRatios = [
  `1:1`,
  `2:3`,
  `3:2`,
  `3:4`,
  `4:3`,
  `9:16`,
  `16:9`,
  `21:9`,
] as const;

export type GeminiImageAspectRatio = (typeof geminiImageAspectRatios)[number];

export function getGeminiImageAspectRatioValue(
  value: GeminiImageAspectRatio | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const [widthText, heightText] = value.split(`:`);
  const width = Number(widthText);
  const height = Number(heightText);

  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  return width / height;
}
