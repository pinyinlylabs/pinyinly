import type { Options, Result } from "execa";
import { execa } from "execa";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.join(import.meta.dirname, `../../.cache/execa`);

export interface CachedExecaResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Creates a cache key from the command and arguments
 */
function createCacheKey(
  file: string,
  args: readonly string[] = [],
  options: Options = {},
  additionalCacheInputs?: Record<string, unknown>,
): string {
  // Include relevant options that affect command execution in the cache key
  const relevantOptions = {
    cwd: options.cwd,
    env: options.env,
    uid: options.uid,
    gid: options.gid,
    shell: options.shell,
    timeout: options.timeout,
  };

  const keyData = {
    file,
    args,
    options: relevantOptions,
    additionalCacheInputs,
  };

  const hash = createHash(`sha256`);
  hash.update(JSON.stringify(keyData));
  return hash.digest(`hex`);
}

/**
 * Ensures the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Gets the cache file path for a given cache key
 */
function getCacheFilePath(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.json`);
}

/**
 * Reads cached result from disk
 */
async function readCachedResult(
  cacheKey: string,
): Promise<CachedExecaResult | null> {
  try {
    const cacheFilePath = getCacheFilePath(cacheKey);
    const content = await fs.readFile(cacheFilePath, `utf8`);
    return JSON.parse(content) as CachedExecaResult;
  } catch {
    return null;
  }
}

/**
 * Writes result to cache
 */
async function writeCachedResult(
  cacheKey: string,
  result: CachedExecaResult,
): Promise<void> {
  await ensureCacheDir();
  const cacheFilePath = getCacheFilePath(cacheKey);
  await fs.writeFile(cacheFilePath, JSON.stringify(result, null, 2));
}

/**
 * Converts a Result to a CachedExecaResult
 */
function toCachedResult(result: Result): CachedExecaResult {
  return {
    stdout: String(result.stdout ?? ``),
    stderr: String(result.stderr ?? ``),
    exitCode: result.exitCode ?? 0,
  };
}

/**
 * A cached version of execa that stores results to disk to avoid re-running expensive commands
 * Returns a simplified result with only stdout, stderr, and exitCode
 */
export async function execaCached(
  file: string,
  args?: readonly string[],
  options?: Options,
  additionalCacheInputs?: Record<string, unknown>,
): Promise<CachedExecaResult> {
  const cacheKey = createCacheKey(file, args, options, additionalCacheInputs);

  // Try to read from cache first
  const cached = await readCachedResult(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute the command
  const result = await execa(file, args, options);

  // Cache the result
  const cachedResult = toCachedResult(result);
  await writeCachedResult(cacheKey, cachedResult);

  return cachedResult;
}

/**
 * Helper function to get file modification time for cache invalidation
 */
export async function getFileModTime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    // If file doesn't exist, return 0
    return 0;
  }
}
