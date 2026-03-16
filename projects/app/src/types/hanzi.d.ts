declare module "hanzi" {
  export const dictionarysimplified: Record<string, readonly Definition[]>;

  interface DecomposeResultAll {
    character: string;
    components1: readonly string[];
    components2: readonly string[];
    components3: readonly string[];
  }

  interface DecomposeResultSingle {
    character: string;
    components: readonly string[];
  }

  export function decompose(character: string): DecomposeResultAll;
  export function decompose(
    character: string,
    type: 1 | 2 | 3,
  ): DecomposeResultSingle;

  export function start(): void;

  interface Definition {
    traditional: string;
    simplified: string;
    pinyin: string;
    definition: string;
  }

  export function definitionLookup(
    word: string,
    scripttype?: `s`,
  ): Definition[] | undefined;

  interface CharacterFrequency {
    /**
     * @example "530"
     */
    number: string;
    /**
     * @example "热"
     */
    character: string;
    /**
     * @example "31190"
     */
    count: string;
    /**
     * @example "76.4970999352"
     */
    percentage: string;
    /**
     * @example "re4"
     */
    pinyin: string;
    /**
     * @example "heat/to heat up/fervent/hot (of weather)/warm up"
     */
    meaning: string;
  }

  export function getCharacterFrequency(
    hanzi: string,
  ): CharacterFrequency | `Character not found`;
}
