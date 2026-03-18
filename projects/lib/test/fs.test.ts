import { gitGlobSync } from "#fs.ts";
import * as fs from "@pinyinly/lib/fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

function git(cwd: string, args: string[]): string {
  return execFileSync(`git`, args, { cwd, encoding: `utf8` }).trim();
}

describe(`gitGlobSync` satisfies HasNameOf<typeof gitGlobSync>, () => {
  const tempDirs: string[] = [];

  function createTempDir() {
    const uniqueName = `pinyinly-lib-fs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempDir = path.join(tmpdir(), uniqueName);
    fs.mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);
    return tempDir;
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
    tempDirs.length = 0;
  });

  test(`matches tracked and untracked files while excluding ignored files`, () => {
    const tempDir = createTempDir();

    git(tempDir, [`init`]);
    git(tempDir, [`config`, `user.email`, `test@example.com`]);
    git(tempDir, [`config`, `user.name`, `Test User`]);

    const iconsDir = path.join(tempDir, `icons`);
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, `.gitignore`), `ignored.svg\n`, `utf8`);
    fs.writeFileSync(path.join(iconsDir, `tracked.svg`), `tracked`, `utf8`);
    fs.writeFileSync(path.join(iconsDir, `untracked.svg`), `untracked`, `utf8`);
    fs.writeFileSync(path.join(iconsDir, `ignored.svg`), `ignored`, `utf8`);

    git(tempDir, [`add`, `.gitignore`, `icons/tracked.svg`]);

    expect(gitGlobSync(`*.svg`, { cwd: iconsDir })).toEqual([
      `tracked.svg`,
      `untracked.svg`,
    ]);
  });

  test(`supports recursive patterns relative to cwd`, () => {
    const tempDir = createTempDir();

    git(tempDir, [`init`]);
    git(tempDir, [`config`, `user.email`, `test@example.com`]);
    git(tempDir, [`config`, `user.name`, `Test User`]);

    const rootDir = path.join(tempDir, `assets`);
    const nestedDir = path.join(rootDir, `nested`);
    const deepDir = path.join(nestedDir, `deep`);
    fs.mkdirSync(deepDir, { recursive: true });

    fs.writeFileSync(path.join(rootDir, `a.svg`), `a`, `utf8`);
    fs.writeFileSync(path.join(nestedDir, `b.svg`), `b`, `utf8`);
    fs.writeFileSync(path.join(deepDir, `c.svg`), `c`, `utf8`);

    git(tempDir, [`add`, `assets/a.svg`, `assets/nested/b.svg`]);

    expect(gitGlobSync(`**/*.svg`, { cwd: rootDir })).toEqual([
      `a.svg`,
      `nested/b.svg`,
      `nested/deep/c.svg`,
    ]);
  });
});
