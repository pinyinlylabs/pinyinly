import type { AssetId } from "@/data/model";

export type MeaningImageStyleKind = `comic` | `realistic`;

interface MeaningImageStyleOption {
  kind: MeaningImageStyleKind;
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

const meaningImageStyleOptionsConst = [
  {
    kind: `comic`,
    label: `Comic`,
    assetId: `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw` as AssetId,
    thumbnailCropRect: {
      x: 0.37,
      y: 0.2,
      width: 0.22,
      height: 0.22,
    },
    stylePrompt: `Use the illustration style from the first image, keep the background a solid color, make outlines crisp and contiguous, use solid fill highlighter shading, studio ghibli concept simplicity, and ultra clean crisp vector shapes.`,
  },
  {
    kind: `realistic`,
    label: `Realistic`,
    assetId: `sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU` as AssetId,
    thumbnailCropRect: {
      x: 0.24,
      y: 0.18,
      width: 0.24,
      height: 0.24,
    },
    stylePrompt: ``,
  },
] as const satisfies readonly MeaningImageStyleOption[];

export const meaningImageStyleOptions = meaningImageStyleOptionsConst;

const meaningImageStyleByKind = new Map(
  meaningImageStyleOptions.map((style) => [style.kind, style] as const),
);

export function normalizeMeaningImageStyleKind(
  value: string | null | undefined,
): MeaningImageStyleKind {
  return value === `realistic` ? `realistic` : `comic`;
}

export function getMeaningImageStyle(
  kind: MeaningImageStyleKind,
): MeaningImageStyleOption {
  const fallbackStyle = meaningImageStyleOptions[0];
  return meaningImageStyleByKind.get(kind) ?? fallbackStyle;
}
