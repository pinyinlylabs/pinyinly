import { hsk30LevelToNumber } from "@/data/hsk";
import type { Hsk30Level } from "@/data/model";

export interface WikiHskLevelDetail {
  hskLevel: Hsk30Level;
  isDirect: boolean;
  isFirstAppearance: boolean;
}

type DictionaryHskEntry = {
  hsk?: Hsk30Level;
  hskFirstAppearance?: Hsk30Level;
};

export function getWikiHskLevelDetails(
  entries: DictionaryHskEntry[],
): WikiHskLevelDetail[] {
  const levels = new Map<
    Hsk30Level,
    Pick<WikiHskLevelDetail, `isDirect` | `isFirstAppearance`>
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
