import { sortComparatorString } from "#collections.ts";
import { readFile, writeUtf8FileIfChanged } from "#fs.ts";
import isEqual from "lodash/isEqual.js";
import path from "node:path";

type JsonFmtRuleType = {
  files: string[];
  indent: number;
};

type JsonFmtConfigType = {
  rules: JsonFmtRuleType[];
};

type JsonFmtConfigLoadResultType = {
  config: JsonFmtConfigType;
  configDir: string;
};

const jsonFmtConfigFilename = `.jsonfmtrc.json`;
const defaultJsonIndent = 2;

function parseJsonFmtConfig(content: unknown): JsonFmtConfigType {
  if (
    typeof content !== `object` ||
    content == null ||
    Array.isArray(content)
  ) {
    throw new Error(`${jsonFmtConfigFilename} must be an object`);
  }

  const rules = (content as { rules?: unknown }).rules;
  if (!Array.isArray(rules)) {
    throw new TypeError(`${jsonFmtConfigFilename} "rules" must be an array`);
  }

  return {
    rules: rules.map((rule, index) => {
      if (typeof rule !== `object` || rule == null || Array.isArray(rule)) {
        throw new Error(
          `${jsonFmtConfigFilename} rule at index ${index} must be an object`,
        );
      }

      const files = (rule as { files?: unknown }).files;
      const indent = (rule as { indent?: unknown }).indent;

      if (!Array.isArray(files) || files.length === 0) {
        throw new Error(
          `${jsonFmtConfigFilename} rule at index ${index} must contain a non-empty "files" array`,
        );
      }

      if (
        files.some(
          (filePattern) =>
            typeof filePattern !== `string` || filePattern.length === 0,
        )
      ) {
        throw new Error(
          `${jsonFmtConfigFilename} rule at index ${index} has an invalid file glob pattern`,
        );
      }

      if (
        typeof indent !== `number` ||
        !Number.isInteger(indent) ||
        indent < 0
      ) {
        throw new Error(
          `${jsonFmtConfigFilename} rule at index ${index} must contain a non-negative integer "indent"`,
        );
      }

      return {
        files,
        indent,
      };
    }),
  };
}

async function loadJsonFmtConfig(
  filePath: string,
): Promise<JsonFmtConfigLoadResultType> {
  const absoluteFilePath = path.resolve(filePath);
  let currentDir = path.dirname(absoluteFilePath);
  const encoding = `utf8`;

  // oxlint-disable-next-line typescript/no-unnecessary-condition
  while (true) {
    const configPath = path.join(currentDir, jsonFmtConfigFilename);
    const configText = await readFile(configPath, { encoding }).catch(
      () => null,
    );

    if (configText != null) {
      const parsed = JSON.parse(configText) as unknown;
      return {
        config: parseJsonFmtConfig(parsed),
        configDir: currentDir,
      };
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return {
    config: {
      rules: [{ files: [`**/*.json`], indent: defaultJsonIndent }],
    },
    configDir: path.dirname(absoluteFilePath),
  };
}

function toRelativePosixPath(baseDir: string, filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(baseDir, absolutePath);
  return relativePath.split(path.sep).join(path.posix.sep).normalize(`NFC`);
}

export async function getJsonIndentForFilePath(
  filePath: string,
): Promise<number> {
  const { config, configDir } = await loadJsonFmtConfig(filePath);
  const relativePosixPath = toRelativePosixPath(configDir, filePath);

  for (const rule of config.rules) {
    const hasMatchingPattern = rule.files.some((pattern) =>
      path.posix.matchesGlob(relativePosixPath, pattern),
    );
    if (hasMatchingPattern) {
      return rule.indent;
    }
  }

  return defaultJsonIndent;
}

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

export async function writeJsonFileIfChanged(
  path: string,
  content: object,
): Promise<boolean> {
  const indentLevels = await getJsonIndentForFilePath(path);
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

  return writeJsonFileIfChanged(path, updatedData);
}
