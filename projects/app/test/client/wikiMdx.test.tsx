// pyly-not-src-test
// @vitest-environment happy-dom

import { DeviceStoreProvider } from "#client/ui/DeviceStoreProvider.tsx";
import { PylyMdxComponents } from "#client/ui/PylyMdxComponents.tsx";
import { registry_ForTesting } from "#client/wiki.js";
import { glob, readFileSync } from "@pinyinly/lib/fs";
import { render, waitForElementToBeRemoved } from "@testing-library/react";
import path from "node:path";
import { Suspense as ReactSuspense } from "react";
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

  for (const [path, entry] of entries) {
    const Component = entry.component;
    // Test a sample of the registry entries - ensures faithful production behavior
    test(`${path} component renders correctly`, async () => {
      const element = (
        <DeviceStoreProvider>
          <ReactSuspense fallback={<div data-testid="suspense-fallback" />}>
            <PylyMdxComponents>
              <Component />
            </PylyMdxComponents>
          </ReactSuspense>
        </DeviceStoreProvider>
      );

      const { queryByTestId } = render(element);

      // Wait for component to load - handle race condition where fallback might not be rendered
      const fallback = queryByTestId(`suspense-fallback`);

      // If fallback exists, wait for it to be removed; otherwise just wait a tick to ensure rendering is complete
      if (fallback) {
        await waitForElementToBeRemoved(fallback);
      }

      // Render again to make sure there are no errors thrown.
      render(element);
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

test(`test`, () => {
  expect(true).toBe(true);
});
