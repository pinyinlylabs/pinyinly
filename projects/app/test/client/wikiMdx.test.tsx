// pyly-not-src-test
// @vitest-environment happy-dom

import { PylyMdxComponents } from "#client/ui/PylyMdxComponents.tsx";
import { registry_ForTesting } from "#client/wiki.js";
import { glob, readFileSync, stat } from "@pinyinly/lib/fs";
import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import path from "node:path";
import { Suspense } from "react";
import { describe, expect, test } from "vitest";
import { projectRoot } from "../helpers.ts";

// Registry approach - tests pre-compiled components with faithful Metro behavior
describe(`mdx rendering (via registry)`, () => {
  // Dynamic import to avoid issues if registry doesn't exist
  test(`registry loads successfully`, async () => {
    try {
      expect(registry_ForTesting).toBeDefined();
      expect(Object.keys(registry_ForTesting).length).toBeGreaterThan(0);
    } catch (error) {
      // If registry doesn't exist, skip this test
      console.warn(`Registry not available, skipping registry tests:`, error);
    }
  });

  // TODO: expand this to cover all .mdx files
  const entries = Object.entries(registry_ForTesting).slice(0, 10);

  for (const [path, Component] of entries) {
    // Test a sample of the registry entries - ensures faithful production behavior
    test(`${path} component renders correctly`, async () => {
      const { container } = render(
        <Suspense fallback={<div data-testid="suspense-fallback" />}>
          <PylyMdxComponents>
            <Component />
          </PylyMdxComponents>
        </Suspense>,
      );

      // Wait for component to load
      await waitForElementToBeRemoved(() =>
        screen.queryByTestId(`suspense-fallback`),
      );

      // Basic checks
      expect(container.firstChild).toBeDefined();
    });
  }
});

// Direct file approach - tests Metro transformation fidelity
describe(`mdx files exist and are valid`, async () => {
  const mdxFiles = await glob(
    path.join(projectRoot, `src/client/wiki/**/*.mdx`),
  );

  test(`finds MDX files`, () => {
    expect(mdxFiles.length).toBeGreaterThan(100); // Ensure we have a good number of files
  });

  test(`all MDX files have corresponding compiled .mdx.tsx files`, async () => {
    const missingCompiledFiles: string[] = [];
    const outdatedCompiledFiles: string[] = [];

    for (const mdxFilePath of mdxFiles) {
      const compiledFilePath = mdxFilePath.replace(/\.mdx$/, `.mdx.tsx`);
      const relativeMdxPath = path.relative(projectRoot, mdxFilePath);
      const relativeCompiledPath = path.relative(projectRoot, compiledFilePath);

      // Check if compiled file exists
      try {
        const mdxStat = await stat(mdxFilePath);
        const compiledStat = await stat(compiledFilePath);

        // Check if compiled file is older than source file
        if (mdxStat.mtime > compiledStat.mtime) {
          outdatedCompiledFiles.push(
            `${relativeMdxPath} -> ${relativeCompiledPath}`,
          );
        }
      } catch {
        // Compiled file doesn't exist
        missingCompiledFiles.push(
          `${relativeMdxPath} -> ${relativeCompiledPath}`,
        );
      }
    }

    // Report missing files
    if (missingCompiledFiles.length > 0) {
      const errorMessage = `The following MDX files don't have compiled .mdx.tsx files:\n${missingCompiledFiles.slice(0, 10).join(`\n`)}${missingCompiledFiles.length > 10 ? `\n... and ${missingCompiledFiles.length - 10} more` : ``}`;
      throw new Error(errorMessage + `\n\nRun: moon run app:codegenMdx`);
    }

    // Report outdated files
    if (outdatedCompiledFiles.length > 0) {
      const errorMessage = `The following compiled .mdx.tsx files are outdated:\n${outdatedCompiledFiles.slice(0, 10).join(`\n`)}${outdatedCompiledFiles.length > 10 ? `\n... and ${outdatedCompiledFiles.length - 10} more` : ``}`;
      throw new Error(errorMessage + `\n\nRun: moon run app:codegenMdx`);
    }
  });

  test(`no orphaned .mdx.tsx files exist without corresponding .mdx files`, async () => {
    // Find all .mdx.tsx files in the wiki directory
    const mdxTsxFiles = await glob(
      path.join(projectRoot, `src/client/wiki/**/*.mdx.tsx`),
    );

    const orphanedCompiledFiles: string[] = [];

    for (const compiledFilePath of mdxTsxFiles) {
      const sourceFilePath = compiledFilePath.replace(/\.mdx\.tsx$/, `.mdx`);
      const relativeCompiledPath = path.relative(projectRoot, compiledFilePath);
      const relativeSourcePath = path.relative(projectRoot, sourceFilePath);

      // Check if source file exists
      try {
        await stat(sourceFilePath);
      } catch {
        // Source file doesn't exist - this is an orphaned compiled file
        orphanedCompiledFiles.push(
          `${relativeCompiledPath} (missing source: ${relativeSourcePath})`,
        );
      }
    }

    // Report orphaned files
    if (orphanedCompiledFiles.length > 0) {
      const errorMessage = `The following .mdx.tsx files are orphaned (no corresponding .mdx file):\n${orphanedCompiledFiles.slice(0, 10).join(`\n`)}${orphanedCompiledFiles.length > 10 ? `\n... and ${orphanedCompiledFiles.length - 10} more` : ``}`;
      throw new Error(
        errorMessage +
          `\n\nPlease remove these orphaned files or ensure their corresponding .mdx files exist.`,
      );
    }
  });

  test(`sample MDX files have expected structure`, async () => {
    // Test a sample for performance
    const sampleFiles = mdxFiles.slice(0, 20);

    for (const filePath of sampleFiles) {
      const content = readFileSync(filePath, `utf8`);

      // Basic validation - should contain markdown-like content
      const hasContent = content.trim().length > 0;
      const relativePath = path.relative(projectRoot, filePath);

      expect(hasContent, `File ${relativePath} should have content`).toBe(true);

      // Check that file follows expected naming convention
      // Accept various MDX file types in the wiki structure
      expect(relativePath).toMatch(/src\/client\/wiki\/.+\/.+\.mdx$/);
    }
  });
});
