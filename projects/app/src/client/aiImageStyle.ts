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
    stylePrompt: `Use this illustration style, keep the background a solid color, make outlines crisp and contiguous, use solid fill highlighter shading, studio ghibli concept simplicity, and ultra clean crisp vector shapes`,
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
