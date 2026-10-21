import { hsk30LevelToNumber } from "@/data/hsk";
import type { Hsk30Level } from "@/data/model";

export interface HskLevelDetail {
  hskLevel: Hsk30Level;
  isDirect: boolean;
  isFirstAppearance: boolean;
}

export interface HskLevelEntry {
  hsk?: Hsk30Level | null;
  hskFirstAppearance?: Hsk30Level | null;
}

export function getHskLevelDetails(
  entries: readonly HskLevelEntry[],
): HskLevelDetail[] {
  const levels = new Map<
    Hsk30Level,
    Pick<HskLevelDetail, `isDirect` | `isFirstAppearance`>
  >();

  for (const entry of entries) {
    if (entry.hsk != null) {
      const detail = levels.get(entry.hsk) ?? {
        isDirect: false,
        isFirstAppearance: false,
      };
      detail.isDirect = true;
      levels.set(entry.hsk, detail);
    }

    if (
      entry.hskFirstAppearance != null &&
      entry.hskFirstAppearance !== entry.hsk
    ) {
      const detail = levels.get(entry.hskFirstAppearance) ?? {
        isDirect: false,
        isFirstAppearance: false,
      };
      detail.isFirstAppearance = true;
      levels.set(entry.hskFirstAppearance, detail);
    }
  }

  return [...levels]
    .sort(([a], [b]) => hsk30LevelToNumber(a) - hsk30LevelToNumber(b))
    .map(([hskLevel, detail]) => ({ hskLevel, ...detail }));
}
