declare module "hanzi" {
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
}
