import { lruMemoize1 } from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";

export function unicodeShortIdentifier(character: string): string {
  const codePoint = character.codePointAt(0);
  invariant(
    codePoint != null,
    `could not get code point for: ${JSON.stringify(character)}`,
  );
  return `U+${codePoint.toString(16).toUpperCase()}`;
}

export function isCjkUnifiedIdeograph(char: string): boolean {
  const codePoint = char.codePointAt(0);

  return (
    codePoint != null &&
    // CJK Unified Ideographs U+4E00 to U+9FFF
    ((codePoint >= 0x4e_00 && codePoint <= 0x9f_ff) ||
      // CJK Unified Ideographs Extension A U+3400 to U+4DBF
      (codePoint >= 0x34_00 && codePoint <= 0x4d_bf) ||
      // CJK Unified Ideographs Extension B U+20000 to U+2A6DF
      (codePoint >= 0x2_00_00 && codePoint <= 0x2_a6_df) ||
      // CJK Unified Ideographs Extension F U+2CEB0 to U+2EBEF
      (codePoint >= 0x2_ce_b0 && codePoint <= 0x2_eb_ef))
  );
}

export function isHanziIdeograph(char: string): boolean {
  const codePoint = char.codePointAt(0);

  return (
    codePoint != null &&
    // CJK Unified Ideographs U+4E00 to U+9FFF
    ((codePoint >= 0x4e_00 && codePoint <= 0x9f_ff) ||
      // CJK Unified Ideographs Extension A U+3400 to U+4DBF
      (codePoint >= 0x34_00 && codePoint <= 0x4d_bf) ||
      // CJK Unified Ideographs Extension B U+20000 to U+2A6DF
      (codePoint >= 0x2_00_00 && codePoint <= 0x2_a6_df) ||
      // CJK Unified Ideographs Extension C U+2A700 to U+2B73F
      (codePoint >= 0x2_a7_00 && codePoint <= 0x2_b7_3f) ||
      // CJK Unified Ideographs Extension D U+2B740 to U+2B81F
      (codePoint >= 0x2_b7_40 && codePoint <= 0x2_b8_1f) ||
      // CJK Unified Ideographs Extension E U+2B820 to U+2CEAF
      (codePoint >= 0x2_b8_20 && codePoint <= 0x2_ce_af) ||
      // CJK Unified Ideographs Extension F U+2CEB0 to U+2EBEF
      (codePoint >= 0x2_ce_b0 && codePoint <= 0x2_eb_ef) ||
      // CJK Unified Ideographs Extension G U+30000 to U+3134F
      (codePoint >= 0x3_00_00 && codePoint <= 0x3_13_4f) ||
      // CJK Unified Ideographs Extension H U+31350 to U+323AF
      (codePoint >= 0x3_13_50 && codePoint <= 0x3_23_af) ||
      // CJK Compatibility Ideographs U+F900 to U+FAFF
      (codePoint >= 0xf9_00 && codePoint <= 0xfa_ff) ||
      // CJK Compatibility Ideographs Supplement U+2F800 to U+2FA1F
      (codePoint >= 0x2_f8_00 && codePoint <= 0x2_fa_1f))
  );
}

export function isNotCjkUnifiedIdeograph(char: string): boolean {
  return !isCjkUnifiedIdeograph(char);
}

const segmenter = new Intl.Segmenter(`en`, { granularity: `grapheme` });

/**
 * Calculate the number of character in a string.
 */
export const characterCount = lruMemoize1(
  (text: string) => {
    let count = 0;
    for (const _ of segmenter.segment(text)) {
      count++;
    }
    return count;
  },
  { max: 200 },
);

export const longestTextByCharacters = (texts: readonly string[]): string => {
  let longest = null;
  let longestLength = 0;
  for (const text of texts) {
    const textLength = characterCount(text);
    if (longest == null || textLength > longestLength) {
      longestLength = textLength;
      longest = text;
    }
  }
  invariant(longest != null, `no texts provided`);

  return longest;
};

export const splitCharacters = lruMemoize1(
  (text: string): readonly string[] => {
    const result = [];
    for (const segment of segmenter.segment(text)) {
      result.push(segment.segment);
    }
    return result;
  },
  { max: 200 },
);

/**
 * Coalesce a nullish or empty string to `null`.
 *
 * @example nullIfEmpty(foo?.name) ?? "Default text"
 *
 * Otherwise it can be difficult to handle both the null case and empty string
 * case when you use optional chaining.
 */
export function nullIfEmpty<T extends string>(
  text: T | null | undefined,
): T | null {
  if (text == null || text.length === 0) {
    return null;
  }
  return text;
}

export function splitN(str: string, sep: string, n: number): string[] {
  if (sep.length === 0) {
    throw new Error(`separator must be non-empty`);
  }

  if (n < 0) {
    throw new Error(`limit must be non-negative`);
  }

  const idxs = [];
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const idx = str.indexOf(sep, pos);
    if (idx === -1) {
      break;
    }
    idxs.push(idx);
    pos = idx + sep.length;
  }

  const out = [];
  let last = 0;

  for (const idx of idxs) {
    out.push(str.slice(last, idx));
    last = idx + sep.length;
  }

  out.push(str.slice(last));
  return out;
}

export function toCamelCase(text: string) {
  return text
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(``);
}
