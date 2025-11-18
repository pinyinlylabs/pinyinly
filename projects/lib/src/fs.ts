// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readFileSync, writeFileSync } from "node:fs";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readFile, writeFile } from "node:fs/promises";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { globSync } from "glob";
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

export function grepSync(globPattern: string, substring: string): string[] {
  const files = globSync(globPattern);
  const matches: string[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, `utf-8`);
    if (content.includes(substring)) {
      matches.push(filePath);
    }
  }
  return matches;
}

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

export async function updateJsonFileKey(
  path: string,
  key: string,
  value: unknown,
  indentLevels?: number,
): Promise<boolean> {
  const encoding = `utf8`;

  let existingData: Record<string, unknown> = {};
  try {
    const existingContent = await readFile(path, { encoding });
    const parsed = JSON.parse(existingContent) as unknown;
    if (
      typeof parsed === `object` &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      existingData = parsed as Record<string, unknown>;
    }
  } catch {
    // File doesn't exist or invalid JSON, start with empty object
  }

  // Update the specific key
  const updatedData = { ...existingData, [key]: value };

  return await writeJsonFileIfChanged(path, updatedData, indentLevels);
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

export function writeUtf8FileIfChangedSync(
  path: string,
  content: string,
): boolean {
  const encoding = `utf8`;
  let hasDiff = true;

  try {
    const existingContent = readFileSync(path, { encoding });
    hasDiff = existingContent !== content;
  } catch {}

  if (hasDiff) {
    writeFileSync(path, content, { encoding });
  }

  return hasDiff;
}

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export { glob, globSync } from "glob";
