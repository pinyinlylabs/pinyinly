// pyly-not-src-test

import { projectRoot } from "#bin/util/paths.ts";
import type {
  CharacterJson,
  CharacterCurriculumMeaningExample,
} from "#data/model.js";
import { characterJsonSchema } from "#data/model.js";
import {
  existsSync,
  glob,
  mkdir,
  readFile,
  readdir,
  rm,
} from "@pinyinly/lib/fs";
import { createMdxAstProcessor } from "@pinyinly/mdx/processor";
import path from "node:path";
import { expect, test } from "vitest";

test(`compiled wiki json is up to date`, { timeout: Infinity }, async () => {
  const mdxFiles = (
    await glob(path.join(projectRoot, `src/client/wiki/**/meaning.mdx`))
  ).sort();

  expect(mdxFiles.length).toBeGreaterThan(100);

  const outputDir = path.join(projectRoot, `public/raw/wiki`);
  await mkdir(outputDir, { recursive: true });

  const mdxFilesByHanzi = new Map(
    mdxFiles.map((mdxFilePath) => [
      path.basename(path.dirname(mdxFilePath)),
      mdxFilePath,
    ]),
  );

  type CharacterCurriculumMeanings = NonNullable<
    CharacterJson[`curriculumMeanings`]
  >;
  const curriculumMeaningsByHanzi = new Map<
    string,
    CharacterCurriculumMeanings
  >();
  const characterJsonFiles = await glob(
    path.join(projectRoot, `src/client/wiki/*/character.json`),
  );
  for (const filePath of characterJsonFiles) {
    const characterJson = characterJsonSchema.parse(
      JSON.parse(await readFile(filePath, `utf8`)) as unknown,
    );
    if (characterJson.curriculumMeanings != null) {
      curriculumMeaningsByHanzi.set(
        characterJson.hanzi,
        characterJson.curriculumMeanings,
      );
    }
  }

  const processor = createMdxAstProcessor();
  const hanziEntries = new Set([
    ...mdxFilesByHanzi.keys(),
    ...curriculumMeaningsByHanzi.keys(),
  ]);
  for (const hanzi of hanziEntries) {
    const payload: {
      mdast?: unknown;
      curriculumMeanings?: CharacterCurriculumMeanings;
      curriculumMeaningExamples?: CharacterCurriculumMeaningExample[];
    } = {};

    const mdxFilePath = mdxFilesByHanzi.get(hanzi);
    if (mdxFilePath != null) {
      const content = await readFile(mdxFilePath, `utf8`);
      const treeParsed = processor.parse({ value: content, path: mdxFilePath });
      const tree = await processor.run(treeParsed);
      payload.mdast = sanitizeMdast(tree);
    }

    const curriculumMeanings = curriculumMeaningsByHanzi.get(hanzi);
    if (curriculumMeanings != null) {
      payload.curriculumMeanings = curriculumMeanings;

      const examples = curriculumMeanings.flatMap(({ id, exampleSentence }) =>
        exampleSentence == null ? [] : [{ id, exampleSentence }],
      );
      if (examples.length > 0) {
        payload.curriculumMeaningExamples = examples;
      }
    }

    await expect(payload).toMatchJsonFileSnapshot(
      path.join(outputDir, `${hanzi}.json`),
    );
  }

  const expectedFileNames = new Set(
    [...hanziEntries].map((hanzi) => `${hanzi}.json`),
  );
  for (const fileName of await readdir(outputDir)) {
    if (fileName.endsWith(`.json`) && !expectedFileNames.has(fileName)) {
      await rm(path.join(outputDir, fileName));
    }
  }

  const legacyMdxOutputDir = path.join(projectRoot, `public/raw/mdx`);
  if (existsSync(legacyMdxOutputDir)) {
    await rm(legacyMdxOutputDir, { recursive: true });
  }
});

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

    await expect(sanitizedTree as object).toMatchJsonFileSnapshot(to);
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
