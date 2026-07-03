// pyly-not-src-test

import { workspaceRoot } from "#bin/util/paths.ts";
import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import { expect, test } from "vitest";

type JsonFmtConfig = {
  rules: Array<{
    files: string[];
  }>;
};

type OxFmtConfig = {
  ignorePatterns: string[];
};

const jsonFmtConfigPath = path.resolve(workspaceRoot, `.jsonfmtrc.json`);
const oxFmtConfigPath = path.resolve(workspaceRoot, `.oxfmtrc.json`);

test(`app json formatter rules are ignored by oxfmt`, async () => {
  const jsonFmtConfig = JSON.parse(
    await fs.readFile(jsonFmtConfigPath, `utf8`),
  ) as JsonFmtConfig;
  const oxFmtConfig = JSON.parse(
    await fs.readFile(oxFmtConfigPath, `utf8`),
  ) as OxFmtConfig;

  const appJsonRules = jsonFmtConfig.rules.flatMap((rule) => rule.files);

  const appJsonRuleFiles = new Set(
    await fs.glob(
      appJsonRules.map((pattern) => resolveWorkspacePattern(pattern)),
    ),
  );
  const ignoredFiles = new Set(
    await fs.glob(expandIgnorePatterns(oxFmtConfig.ignorePatterns)),
  );

  for (const filePath of appJsonRuleFiles) {
    expect(
      ignoredFiles.has(filePath),
      `Expected ${filePath} to be ignored by .oxfmtrc.json`,
    ).toBe(true);
  }
});

function resolveWorkspacePattern(pattern: string): string {
  return path.resolve(workspaceRoot, normalizeWorkspacePattern(pattern));
}

function expandIgnorePatterns(patterns: string[]): string[] {
  const expandedPatterns: string[] = [];

  for (const pattern of patterns) {
    const normalizedPattern = normalizeWorkspacePattern(pattern);
    expandedPatterns.push(path.resolve(workspaceRoot, normalizedPattern));

    if (!normalizedPattern.includes(`/`)) {
      expandedPatterns.push(
        path.resolve(workspaceRoot, `**/${normalizedPattern}`),
      );
    }
  }

  return expandedPatterns;
}

function normalizeWorkspacePattern(pattern: string): string {
  return pattern.replace(/^\//u, ``);
}
