import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

test(`.env file does not exist in projects/app`, async () => {
  const projectRoot = import.meta.dirname + `/..`;

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
  const projectRoot = import.meta.dirname + `/..`;
  const testRoot = `${projectRoot}/test`;
  const srcRoot = `${projectRoot}/src`;

  const srcRelPaths = await getTreePaths(srcRoot, `**/*`);
  const srcRelPathsSet = new Set(srcRelPaths);
  const testRelPaths = await getTreePaths(testRoot, `**/*.{test,test-d}.*`);

  // Test that every test files corresponds to a src/ file (or it has a
  // `// hhh-standalone-test`), and that every standalone test does not have a
  // src/ file.
  const unexpectedTestPaths: string[] = [];
  const unexpectedStandaloneTestPaths: string[] = [];

  for (const testRelPath of testRelPaths) {
    const hasSrcFile = [
      // Look for both .ts or .tsx source files.
      testRelPath.replace(/\.test(-d)?\.tsx?/, `.ts`),
      testRelPath.replace(/\.test(-d)?\.tsx?/, `.tsx`),
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

  expect(unexpectedTestPaths).toEqual([]);
  expect(unexpectedStandaloneTestPaths).toEqual([]);
});

async function getTreePaths(root: string, glob: string): Promise<string[]> {
  const paths: string[] = [];
  for await (const p of fs.glob(`${root}/${glob}`)) {
    paths.push(path.relative(root, p));
  }
  return paths;
}

/**
 * Check if a test file is a standalone test file, which is defined as a
 * file that contains the comment `// hhh-standalone-test` somewhere in it.
 */
async function isStandaloneTestFile(testPath: string): Promise<boolean> {
  const contents = await fs.readFile(testPath, `utf8`);
  return /\/\/\s+hhh-standalone-test/m.test(contents);
}
