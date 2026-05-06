import type { HanziCharacter, HanziText } from "@/data/model";
import { isHanziCharacter } from "@/data/hanzi";

export interface FlatHanziVisualIndex {
  count: number;
  dims: number;
  hanziChars: readonly string[];
  vectors: Float32Array;
}

export interface HanziVisualSuggestion {
  hanzi: HanziCharacter;
  score: number;
}

/**
 * Parses a binary embedding index (6-byte header: uint32 count LE + uint16 dims LE,
 * followed by raw float32 vectors) combined with a codepoints metadata array.
 * Codepoints are strings in "U+XXXX" format.
 * Only entries that are valid Hanzi characters are included.
 * If `allowedCharacters` is provided, entries not in the set are skipped.
 */
export function parseFlatIndex(
  buffer: ArrayBuffer,
  codepoints: readonly string[],
  allowedCharacters?: ReadonlySet<string>,
): FlatHanziVisualIndex {
  const view = new DataView(buffer);
  const count = view.getUint32(0, true);
  const dims = view.getUint16(4, true);
  const allVectors = new Float32Array(buffer.slice(6));

  const hanziChars: string[] = [];
  const hanziVectors: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const cpStr = codepoints[i];
    if (cpStr == null) {
      continue;
    }
    const codepoint = Number.parseInt(cpStr.slice(2), 16);
    const char = String.fromCodePoint(codepoint);
    const normalizedChar = char.normalize(`NFKC`);

    if (!isHanziCharacter(normalizedChar as HanziText)) {
      continue;
    }
    if (allowedCharacters != null && !allowedCharacters.has(normalizedChar)) {
      continue;
    }

    hanziChars.push(normalizedChar);
    const offset = i * dims;
    for (let j = 0; j < dims; j += 1) {
      hanziVectors.push(allVectors[offset + j] ?? 0);
    }
  }

  return {
    count: hanziChars.length,
    dims,
    hanziChars,
    vectors: new Float32Array(hanziVectors),
  };
}

export function searchNearestByDotProduct({
  queryEmbedding,
  index,
  limit,
}: {
  queryEmbedding: Float32Array;
  index: FlatHanziVisualIndex;
  limit: number;
}): HanziVisualSuggestion[] {
  const { count, dims, hanziChars, vectors } = index;

  if (queryEmbedding.length !== dims) {
    return [];
  }

  const scores = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    let dot = 0;
    const offset = i * dims;
    for (let j = 0; j < dims; j += 1) {
      dot += (queryEmbedding[j] ?? 0) * (vectors[offset + j] ?? 0);
    }
    scores[i] = dot;
  }

  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  const results: HanziVisualSuggestion[] = [];
  const safeLimit = Math.max(limit, 0);
  for (let rank = 0; rank < safeLimit && rank < indices.length; rank += 1) {
    const idx = indices[rank] ?? 0;
    const hanzi = hanziChars[idx];
    if (hanzi != null) {
      results.push({ hanzi: hanzi as HanziCharacter, score: scores[idx] ?? 0 });
    }
  }

  return results;
}
