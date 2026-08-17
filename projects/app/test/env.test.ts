import { projectRoot } from "#bin/util/paths.ts";
import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import { expect, test } from "vitest";

test(`projectRoot is correct`, async () => {
  // Check that `projectRoot` is pointing to the correct directory.
  await expect(fs.access(projectRoot + `/package.json`)).resolves.not.toThrow();
});

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

  const srcRelPaths = Array.from(await fs.glob(`**/*`, { cwd: srcRoot }));
  const srcRelPathsSet = new Set(srcRelPaths);
  const testRelPaths = Array.from(
    await fs.glob(`**/*.{eval,test,test-d}.ts{,x}`, {
      cwd: testRoot,
      ignore: [`**/__*__/**`],
    }),
  );

  expect(srcRelPaths.length).toBeGreaterThan(20);
  expect(testRelPaths.length).toBeGreaterThan(20);

  for (const testRelPath of testRelPaths) {
    // e.g. foo.test-d.tsx -> foo
    const testRelPathNoExt = testRelPath.replace(
      /\.(browser\.test|test(-d)?|eval)\.tsx?$/u,
      ``,
    );
    const srcRelPath = [
      // Look for both .ts or .tsx source files.
      `${testRelPathNoExt}.ts`,
      `${testRelPathNoExt}.tsx`,
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

/**
 * Check if a test file is a standalone test file, which is defined as a
 * file that contains the comment `// pyly-not-src-test` somewhere in it.
 */
async function isStandaloneTestFile(testPath: string): Promise<boolean> {
  const stat = await fs.stat(testPath);
  if (!stat.isFile()) {
    return false;
  }

  const contents = await fs.readFile(testPath, `utf8`);
  return /\/\/\s+pyly-not-src-test/mu.test(contents);
}
