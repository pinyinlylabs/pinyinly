import { readFile, writeFile } from "node:fs/promises";

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
