import { matchAllHanziCharacters } from "@/data/hanzi";
import type { HanziCharacter, HanziText } from "@/data/model";

export interface CharacterItemForWord {
  hanzi: HanziCharacter;
  position: number;
}

export function getCharacterItemsForWord(
  hanzi: HanziText,
): CharacterItemForWord[] {
  const seen = new Set<HanziCharacter>();
  const result: CharacterItemForWord[] = [];
  for (const [index, char] of matchAllHanziCharacters(hanzi).entries()) {
    if (!seen.has(char)) {
      seen.add(char);
      result.push({ hanzi: char, position: index });
    }
  }
  return result;
}
