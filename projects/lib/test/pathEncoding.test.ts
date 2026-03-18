import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(testDir, `../../..`);

function gitLsFilesSync(cwd: string): string[] {
  const output = execFileSync(
    `git`,
    [`ls-files`, `-z`, `--cached`, `--others`, `--exclude-standard`],
    {
      cwd,
      encoding: `utf8`,
      stdio: [`pipe`, `pipe`, `ignore`],
    },
  );

  return output
    .split(`\0`)
    .filter((relativePath) => relativePath.length > 0)
    .sort();
}

test(`git-tracked file paths are normalized to NFC`, async () => {
  // - NFC = Normalization Form Composed
  // - NFD = Normalization Form Decomposed
  //
  // On macOS file paths can appear decomposed (e + ◌́), while in git and Linux
  // environments paths are treated as raw bytes. If the repo has mixed forms,
  // cross-platform path lookups can break. We enforce NFC at the repository
  // level to keep path bytes consistent across platforms.
  for (const relativePath of gitLsFilesSync(workspaceRoot)) {
    expect
      .soft(relativePath, `Path ${relativePath} is not normalized to NFC`)
      .toEqual(relativePath.normalize(`NFC`));
  }
});
