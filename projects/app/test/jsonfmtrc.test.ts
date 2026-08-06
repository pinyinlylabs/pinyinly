// pyly-not-src-test

import { format } from "@pinyinly/lib/jsonfmt";
import { workspaceRoot } from "#bin/util/paths.ts";
import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import { expect, test } from "vitest";

type JsonFmtConfig = {
  rules: Array<{
    files: string[];
    indent: number;
  }>;
};

const jsonFmtConfigPath = path.resolve(workspaceRoot, `.jsonfmtrc.json`);

test(`app json formatter rules are respected by formatted files`, async () => {
  const jsonFmtConfig = JSON.parse(
    await fs.readFile(jsonFmtConfigPath, `utf8`),
  ) as JsonFmtConfig;

  const matchedFilePaths = new Set(
    await fs.glob(
      jsonFmtConfig.rules.flatMap((rule) =>
        rule.files.map((pattern) => resolveWorkspacePattern(pattern)),
      ),
    ),
  );

  expect(matchedFilePaths.size).toBeGreaterThan(0);

  for (const filePath of matchedFilePaths) {
    const actualContent = await fs.readFile(filePath, `utf8`);
    const formattedContent = await format(filePath, actualContent);

    await expect(formattedContent, `File: ${filePath}`).toMatchFileSnapshot(
      filePath,
    );
  }
});

function resolveWorkspacePattern(pattern: string): string {
  return path.resolve(workspaceRoot, normalizeWorkspacePattern(pattern));
}

function normalizeWorkspacePattern(pattern: string): string {
  return pattern.replace(/^\//u, ``);
}
