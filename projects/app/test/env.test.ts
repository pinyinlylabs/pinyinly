import * as fs from "@pinyinly/lib/fs";
import chalk from "chalk";
import path from "node:path";
import { expect, test } from "vitest";
import { projectRoot } from "./helpers.ts";

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
  const testRoot = `${projectRoot}/test`;
  const srcRoot = `${projectRoot}/src`;

  const srcRelPaths = await getTreePaths(srcRoot, `**/*`);
  const srcRelPathsSet = new Set(srcRelPaths);
  const testRelPaths = await getTreePaths(testRoot, `**/*.{test,test-d}.tsx?`);

  // Test that every test files corresponds to a src/ file (or it has a
  // `// pyly-not-src-test`), and that every standalone test does not have a
  // src/ file.
  const unexpectedTestPaths: string[] = [];
  const unexpectedStandaloneTestPaths: string[] = [];

  for (const testRelPath of testRelPaths) {
    const hasSrcFile = [
      // Look for both .ts or .tsx source files.
      testRelPath.replace(/\.test(-d)?\.tsx?$/, `.ts`),
      testRelPath.replace(/\.test(-d)?\.tsx?$/, `.tsx`),
    ].some((x) => srcRelPathsSet.has(x));
    const isStandalone = await isStandaloneTestFile(
      path.resolve(testRoot, testRelPath),
    );

    if (isStandalone) {
      if (hasSrcFile) {
        unexpectedStandaloneTestPaths.push(testRelPath);
      }
    } else {
      if (!hasSrcFile) {
        unexpectedTestPaths.push(testRelPath);
      }
    }
  }

  if (unexpectedTestPaths.length > 0) {
    console.warn(
      chalk.yellow(
        `Found test files that do not have a corresponding src/ file, add `,
        chalk.bold(`// pyly-not-src-test`),
        `to the file if this is intended.`,
      ),
    );
    console.warn(unexpectedTestPaths.join(`\n`));
  }
  expect(unexpectedTestPaths).toEqual([]);
  expect(unexpectedStandaloneTestPaths).toEqual([]);
});

test(`src/ files have consistent NFC and NFD encoding`, async () => {
  // On macOS file paths are encoded using NFD, but on other platforms they are
  // NFC. When you require(…) a path with metro (maybe Node.js too?), the bytes
  // you pass in need to match the filesystem. This means that on macOS you need
  // to pass in an NFD encoded path, and on other platforms you need to pass in
  // an NFC encoded path.
  //
  // To avoid this problem it's best to just avoid using accented characters
  // in file paths.
  const srcRoot = `${projectRoot}/src`;

  for (const path of await fs.glob(`${srcRoot}/**/*`)) {
    expect(path.normalize(`NFD`)).toEqual(path.normalize(`NFC`));
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
