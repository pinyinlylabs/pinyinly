import type { AssetId } from "@/data/model";

export type AiImageStyleKind = `comic` | `realistic`;

interface AiImageStyleConfig {
  kind: AiImageStyleKind;
  label: string;
  assetId: AssetId;
  thumbnailCropRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  stylePrompt: string;
}

export const aiImageStyleConfigs = [
  {
    kind: `comic`,
    label: `Comic`,
    assetId: `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
    thumbnailCropRect: {
      x: 0.37,
      y: 0.2,
      width: 0.22,
      height: 0.22,
    },
    stylePrompt: `Use this illustration style, keeping the background a solid color, making outlines crisp and contiguous, using solid fill highlighter shading, studio ghibli concept simplicity, and ultra clean crisp vector shapes. But DO NOT copy the content of the image, just the style. The content should be based on the input prompt.`,
  },
  {
    kind: `realistic`,
    label: `Realistic`,
    assetId: `sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU`,
    thumbnailCropRect: {
      x: 0.24,
      y: 0.18,
      width: 0.24,
      height: 0.24,
    },
    stylePrompt: ``,
  },
] as const satisfies readonly AiImageStyleConfig[];

const aiImageStyleByKind = new Map(
  aiImageStyleConfigs.map((style) => [style.kind, style] as const),
);

export function normalizeAiImageStyleKind(
  value: string | null | undefined,
): AiImageStyleKind | null {
  return value == null ? null : value === `realistic` ? `realistic` : `comic`;
}

export function getAiImageStyleConfig(
  kind: AiImageStyleKind,
): AiImageStyleConfig {
  const fallbackStyle = aiImageStyleConfigs[0];
  return aiImageStyleByKind.get(kind) ?? fallbackStyle;
}
