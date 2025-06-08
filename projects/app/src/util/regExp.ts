/**
 * Escape characters for use in a RegExp pattern.
 * @param pattern
 */
export function regExpEscape(pattern: string): string {
  return pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
