/**
 * Stringify an object with a fixed number of levels of indentation to make
 * diffs more readable without too much white space.
 */
export function jsonStringifyShallowIndent(
  obj: unknown,
  indentLevels = 1,
  level = 0,
): string {
  const indentString = ` `.repeat(level);

  const toJson = (x: unknown) =>
    level === indentLevels
      ? JSON.stringify(x)
      : jsonStringifyShallowIndent(x, indentLevels, level + 1);

  if (Array.isArray(obj)) {
    return `[\n${obj.map((x) => indentString + toJson(x)).join(`,\n`)}\n]`;
  } else if (typeof obj === `object` && obj !== null) {
    return `{\n${Object.entries(obj)
      .map(([k, v]) => indentString + `${toJson(k)}:${toJson(v)}`)
      .join(`,\n`)}\n}`;
  }

  return toJson(obj);
}
