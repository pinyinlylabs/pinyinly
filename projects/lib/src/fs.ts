// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readFile, writeFile } from "node:fs/promises";

import { jsonStringifyShallowIndent } from "./json.ts";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export { glob, globSync } from "glob";

export async function writeJsonFileIfChanged(
  path: string,
  content: object,
  indentLevels?: number,
): Promise<boolean> {
  return await writeUtf8FileIfChanged(
    path,
    jsonStringifyShallowIndent(content, indentLevels),
  );
}

export async function writeUtf8FileIfChanged(
  path: string,
  content: string,
): Promise<boolean> {
  const encoding = `utf8`;

  const existingContent = await readFile(path, { encoding }).catch(() => null);
  const hasDiff = existingContent !== content;
  if (hasDiff) {
    await writeFile(path, content, { encoding });
  }
  return hasDiff;
}
