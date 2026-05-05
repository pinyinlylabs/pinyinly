import type { HanziCharacter } from "@/data/model";

export interface UseHanziVisualSuggestionsParams {
  strokePaths: readonly string[] | null;
  selectedStrokeIndexes: readonly number[];
  pixelOffsetX?: number;
  pixelOffsetY?: number;
  limit?: number;
  debounceMs?: number;
}

export type HanziVisualSuggestionsState =
  | { kind: `idle` }
  | { kind: `loading` }
  | {
      kind: `success`;
      suggestions: readonly {
        hanzi: HanziCharacter;
        score: number;
      }[];
      debugBitmapUrl: string;
    }
  | { kind: `error`; message: string }
  | { kind: `unsupported`; message: string };

export function useHanziVisualSuggestions(
  _params: UseHanziVisualSuggestionsParams,
): HanziVisualSuggestionsState {
  return {
    kind: `unsupported`,
    message: `Visual ONNX suggestions are currently web-only.`,
  };
}
