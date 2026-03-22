import type { WikiCharacterData } from "@/data/model";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";

interface WikiHanziCharacterIntroProps {
  characterData: WikiCharacterData;
}

export function WikiHanziCharacterIntro({
  characterData,
}: WikiHanziCharacterIntroProps) {
  return <WikiHanziCharacterDecomposition characterData={characterData} />;
}
