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
    ((codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      // CJK Unified Ideographs Extension A U+3400 to U+4DBF
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      // CJK Unified Ideographs Extension B U+20000 to U+2A6DF
      (codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
      // CJK Unified Ideographs Extension F U+2CEB0 to U+2EBEF
      (codePoint >= 0x2ceb0 && codePoint <= 0x2ebef))
  );
}

export function isNotCjkUnifiedIdeograph(char: string): boolean {
  return !isCjkUnifiedIdeograph(char);
}

/**
 * Calculate the number of glyphs (characters) in a string.
 */
export function glyphCount(text: string): number {
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  return [...text].length;
}

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
