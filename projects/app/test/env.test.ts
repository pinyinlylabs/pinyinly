import { projectRoot } from "#bin/util/paths.ts";
import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import { expect, test } from "vitest";

test(
  `projectRoot is correct` satisfies HasNameOf<typeof projectRoot>,
  async () => {
    // Check that `projectRoot` is pointing to the correct directory.
    await expect(
      fs.access(projectRoot + `/package.json`),
    ).resolves.not.toThrow();
  },
);

test(`.env file does not exist in projects/app`, async () => {
  // Check that `projectRoot` is pointing to the correct directory.
  await expect(fs.access(projectRoot + `/package.json`)).resolves.not.toThrow();

  // Intentionally left absent. Do not use this file as it's not used for Expo API
  // routes (see https://docs.expo.dev/router/reference/api-routes/#deployment)
  //
  // > @expo/server does not inflate environment variables from .env files. They
  // > are expected to load either by the hosting provider or the user.
  await expect(fs.access(projectRoot + `/.env`)).rejects.toThrow();
});

test(`tests/ tree mirrors src/ tree`, async () => {
  // Test that every test files corresponds to a src/ file (or it has a
  // `// pyly-not-src-test`), and that every standalone test does not have a
  // src/ file.

  const testRoot = `${projectRoot}/test`;
  const srcRoot = `${projectRoot}/src`;

  const srcRelPaths = await getTreePaths(srcRoot, `**/*`);
  const srcRelPathsSet = new Set(srcRelPaths);
  const testRelPaths = await getTreePaths(
    testRoot,
    `**/*.{test,test-d}.ts{,x}`,
  );

  expect(srcRelPaths.length).toBeGreaterThan(20);
  expect(testRelPaths.length).toBeGreaterThan(20);

  for (const testRelPath of testRelPaths) {
    const srcRelPath = [
      // Look for both .ts or .tsx source files.
      testRelPath.replace(/\.test(-d)?\.tsx?$/, `.ts`),
      testRelPath.replace(/\.test(-d)?\.tsx?$/, `.tsx`),
    ].find((x) => srcRelPathsSet.has(x));
    const isStandalone = await isStandaloneTestFile(
      path.resolve(testRoot, testRelPath),
    );

    if (isStandalone) {
      expect
        .soft(
          srcRelPath,
          `${testRelPath} test is marked as "standalone" but has a corresponding file in src/ as ${srcRelPath}, or remove "// pyly-not-src-test" `,
        )
        .toBeUndefined();
    } else {
      expect
        .soft(
          srcRelPath,
          `${testRelPath} should have matching source file in src/, or should be marked as "standalone" by adding a "// pyly-not-src-test" comment`,
        )
        .not.toBeUndefined();
    }
  }
});

test(`src/ file paths are tracked consistently in git (using NFC encoding instead of NFD)`, async () => {
  // - NFC = Normalization Form Composed
  // - NFD = Normalization Form Decomposed
  //
  // On macOS file paths are encoded using NFD (decomposed i.e. e + ◌́), but on
  // Linux they are stored as raw bytes, and in git they're tracked as raw
  // bytes, so if they happen to be committed as NFC (composed i.e. é) then on
  // Linux (in CI) they'll end up with a different filename than on macOS. When
  // you require(…) a path with metro (maybe Node.js too?), the bytes you pass
  // in need to match the filesystem. On macOS it normalizes the filename you
  // pass (e.g. to require(…)), but on other platforms you need to pass in an
  // exact match.
  //
  // To make things a bit more predictable we make sure all file paths are NFC.
  // Here's what ChatGPT had to say:
  //
  // > NFC is the safer repo/tooling convention because it is the more common
  // > “portable interchange” form across:
  // >
  // > - source code strings
  // > - generated code
  // > - JSON
  // > - Git policies
  // > - Linux/Windows environments
  // > - most Unicode text handling outside macOS filesystem quirks
  // >
  // > NFD is mostly attractive because macOS filesystems tend to present names
  // > in decomposed form, but that is a local filesystem behavior, not a great
  // > universal project convention.
  const srcRoot = `${projectRoot}/src`;

  for (const path of fs.gitGlobSync(`**/*`, { cwd: srcRoot })) {
    expect
      .soft(path, `Path ${path} is not normalized to NFC`)
      .toEqual(path.normalize(`NFC`));
  }
});

async function getTreePaths(
  root: string,
  globPattern: string,
): Promise<string[]> {
  const paths: string[] = [];
  for (const p of await fs.glob(`${root}/${globPattern}`)) {
    paths.push(path.relative(root, p));
  }
  return paths;
}

/**
 * Check if a test file is a standalone test file, which is defined as a
 * file that contains the comment `// pyly-not-src-test` somewhere in it.
 */
async function isStandaloneTestFile(testPath: string): Promise<boolean> {
  const contents = await fs.readFile(testPath, `utf8`);
  return /\/\/\s+pyly-not-src-test/m.test(contents);
}
