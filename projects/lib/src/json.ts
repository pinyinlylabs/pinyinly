import { sortComparatorString } from "#collections.ts";

/**
 * Stringify an object with a fixed number of levels of indentation to make
 * diffs more readable without too much white space.
 */
export function jsonStringifyShallowIndent(
  obj: unknown,
  indentLevels = 1,
  level = 0,
): string {
  const thisIndent = `  `.repeat(level);
  const childIndent = `  `.repeat(level + 1);

  if (level === indentLevels) {
    return JSON.stringify(obj, stableObjectKeyOrder);
  }

  const toJson = (x: unknown) =>
    jsonStringifyShallowIndent(x, indentLevels, level + 1);

  if (Array.isArray(obj)) {
    return `[\n${obj.map((x) => childIndent + toJson(x)).join(`,\n`)}\n${thisIndent}]`;
  } else if (typeof obj === `object` && obj !== null) {
    return `{\n${Object.entries(obj)
      // stable key ordering for minimal diffs
      .sort(sortComparatorString(([k]) => k))
      .map(([k, v]) => childIndent + `${toJson(k)}:${toJson(v)}`)
      .join(`,\n`)}\n${thisIndent}}`;
  }

  return toJson(obj);
}

function stableObjectKeyOrder<T>(_key: string, value: T): T {
  if (typeof value === `object` && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).sort(sortComparatorString(([k]) => k)),
    ) as T;
  }
  return value;
}
