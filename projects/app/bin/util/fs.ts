import { readFile, stat } from "@pinyinly/lib/fs";
import path from "node:path";
import type { z } from "zod/v4";

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
