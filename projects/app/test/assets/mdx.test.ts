// pyly-not-src-test

import { projectRoot } from "#bin/util/paths.ts";
import { isCi } from "#util/env.ts";
import {
  glob,
  mkdir,
  readFile,
  writeJsonFileIfChanged,
} from "@pinyinly/lib/fs";
import { createMdxAstProcessor } from "@pinyinly/mdx/processor";
import path from "node:path";
import { expect, test } from "vitest";

test(
  `compiled wiki mdx json is up to date`,
  { timeout: Infinity },
  async () => {
    const mdxFiles = (
      await glob(path.join(projectRoot, `src/client/wiki/**/meaning.mdx`))
    ).sort();

    expect(mdxFiles.length).toBeGreaterThan(100);

    const outputDir = path.join(projectRoot, `public/raw/mdx`);
    await mkdir(outputDir, { recursive: true });

    await compileMdxFiles(
      mdxFiles.map((mdxFilePath) => ({
        from: mdxFilePath,
        to: path.join(
          outputDir,
          `${path.basename(path.dirname(mdxFilePath))}.json`,
        ),
      })),
    );
  },
);

test(`compiled demo mdx json is up to date`, async () => {
  const mdxFiles = (
    await glob(path.join(projectRoot, `src/client/ui/demo/mdx/*.mdx`))
  ).sort();

  await compileMdxFiles(
    mdxFiles.map((mdxFilePath) => ({
      from: mdxFilePath,
      to: mdxFilePath.replace(/\.mdx$/u, `.mdast.json`),
    })),
  );
});

async function compileMdxFiles(
  pairs: Array<{ from: string; to: string }>,
): Promise<void> {
  const processor = createMdxAstProcessor();

  for (const { from, to } of pairs) {
    const content = await readFile(from, `utf8`);
    const treeParsed = processor.parse({ value: content, path: from });
    const tree = await processor.run(treeParsed);
    const sanitizedTree = sanitizeMdast(tree);

    if (!isCi) {
      await writeJsonFileIfChanged(to, sanitizedTree as object, 2);
    }

    const generatedJson = JSON.parse(await readFile(to, `utf8`)) as unknown;

    expect(generatedJson).toEqual(sanitizedTree);
  }
}

function sanitizeMdast(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeMdast(item))
      .filter((item) => item !== undefined && item !== null);
  }

  if (typeof value !== `object` || value == null) {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (record[`type`] === `mdxjsEsm`) {
    return null;
  }

  const next: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    if (key === `position` || key === `data` || key === `estree`) {
      continue;
    }

    const sanitized = sanitizeMdast(child);

    if (sanitized === undefined) {
      continue;
    }

    next[key] = sanitized;
  }

  if (Array.isArray(next[`children`])) {
    next[`children`] = next[`children`].filter((child) => child !== null);
  }

  return next;
}
