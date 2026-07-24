import type { GeminiImageAspectRatio } from "@/server/lib/gemini";

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
