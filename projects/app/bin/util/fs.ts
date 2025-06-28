import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod/v4";

export async function writeUtf8FileIfChanged(
  path: string,
  content: string,
  readOnly = false,
): Promise<boolean> {
  const encoding = `utf8`;

  const existingContent = await readFile(path, { encoding }).catch(() => null);
  const hasDiff = existingContent !== content;
  if (hasDiff && !readOnly) {
    await writeFile(path, content, { encoding });
  }
  return hasDiff;
}

/**
 * Read and parse a file using a zod schema, or return a fallback value if the
 * file doesn't exist.
 */
export async function readFileWithSchema<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  valueIfMissing: z.infer<Schema>,
): Promise<z.infer<Schema>> {
  // Handle the case where the file doesn't exist yet.
  if ((await stat(path).catch(() => null)) == null) {
    return valueIfMissing;
  }

  const content = await readFile(path, `utf8`);
  return schema.parse(JSON.parse(content));
}

export const dictionaryPath = path.join(
  import.meta.dirname,
  `../../src/dictionary/`,
);
