// oxlint-disable-next-line no-restricted-imports
import { readFileSync, writeFileSync } from "node:fs";

// oxlint-disable-next-line no-restricted-imports
import { readFile, stat, writeFile } from "node:fs/promises";

// oxlint-disable-next-line no-restricted-imports
import { globSync } from "glob";

import { invariant } from "@pinyinly/lib/invariant";
import type { Debugger } from "debug";
import isEqual from "lodash/isEqual.js";
import { DatabaseSync } from "node:sqlite";
import type { z } from "zod/v4";
import { jsonStringifyShallowIndent } from "./json.ts";

// oxlint-disable-next-line no-restricted-imports
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

// oxlint-disable-next-line eslint/no-restricted-imports
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
  return writeUtf8FileIfChanged(
    path,
    jsonStringifyShallowIndent(content, indentLevels),
    (a, b) => isEqual(JSON.parse(a), JSON.parse(b)),
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

  return writeJsonFileIfChanged(path, updatedData, indentLevels);
}

export async function writeUtf8FileIfChanged(
  path: string,
  content: string,
  isEqualFn: (a: string, b: string) => boolean = (a, b) => a === b,
): Promise<boolean> {
  const encoding = `utf8`;

  const existingContent = await readFile(path, { encoding }).catch(() => null);
  const hasDiff =
    existingContent == null || !isEqualFn(existingContent, content);
  if (hasDiff) {
    await writeFile(path, content, { encoding });
  }
  return hasDiff;
}

export function writeUtf8FileIfChangedSync(
  path: string,
  content: string,
  isEqualFn: (a: string, b: string) => boolean = (a, b) => a === b,
): boolean {
  const encoding = `utf8`;
  let hasDiff = true;

  try {
    const existingContent = readFileSync(path, { encoding });
    hasDiff = !isEqualFn(existingContent, content);
  } catch {}

  if (hasDiff) {
    writeFileSync(path, content, { encoding });
  }

  return hasDiff;
}

// oxlint-disable-next-line no-restricted-imports
export { glob, globSync } from "glob";

export function makeFsDbCache<K, V>(
  scriptFilename: string,
  tableName = `cache`,
  parentDebug?: Debugger,
) {
  const debug = parentDebug?.extend(`makeFsDbCache`);
  const dbLocation = scriptFilename.replace(/\.[^.]+$/, `.cache.db`);
  debug?.(`using db: ${dbLocation}`);
  const db = new DatabaseSync(dbLocation);

  db.exec(`
  CREATE TABLE IF NOT EXISTS ${tableName}(
    request TEXT PRIMARY KEY,
    response TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  ) STRICT
  `);

  return {
    get(key: K): V | undefined {
      const keyText = JSON.stringify(key);
      debug?.(`getting cache for key: %O`, keyText);

      const result = db
        .prepare(`SELECT * FROM ${tableName} WHERE request = ?`)
        .get(keyText) as
        | { request: string; response: string; created_at: string }
        | undefined;

      return result == null ? undefined : (JSON.parse(result.response) as V);
    },
    set(key: K, value: V): void {
      const keyText = JSON.stringify(key);
      const valueText = JSON.stringify(value);
      debug?.(`inserting cache for key: %O, value: %O`, keyText, valueText);

      db.prepare(
        `INSERT INTO ${tableName} (request, response) VALUES (?, ?)`,
      ).run(keyText, valueText);
    },
  };
}

export type FsDbCache = ReturnType<typeof makeFsDbCache>;

export const fetchWithFsDbCache = async (
  body: Parameters<typeof fetch>[0],
  ctx: {
    fsDbCache: FsDbCache;
    debug?: Debugger;
  },
) => {
  const debug = ctx.debug?.extend(`fetchWithFsDbCache`);
  const cacheKey = JSON.stringify(body);
  const cached = ctx.fsDbCache.get(cacheKey);
  if (cached == null) {
    debug?.(`Making fetch request: %O`, body);
    const response = await fetch(body);
    const result = await response.text();
    debug?.(`response size: %O`, result.length);
    ctx.fsDbCache.set(cacheKey, result);
    return result;
  }
  invariant(typeof cached === `string`);
  return cached;
};

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
