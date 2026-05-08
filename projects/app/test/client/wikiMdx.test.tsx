// @vitest-environment happy-dom

// pyly-not-src-test

import { projectRoot } from "#bin/util/paths.ts";
import type { WikiMdastRoot } from "#client/query.ts";
import { MDXComponents } from "#client/ui/MDXComponents.tsx";
import { MdastContent } from "#client/ui/MdastContent.tsx";
import { PylyMdxComponents } from "#client/ui/PylyMdxComponents.tsx";
import {
  CustomComponent,
  CustomWrapper,
  Separator,
} from "#client/ui/demo/mdx/helpers.tsx";
import templateMdastJson from "#client/ui/demo/mdx/template.mdast.json";
import { glob, readFileSync } from "@pinyinly/lib/fs";
import { render, screen } from "@testing-library/react";
import path from "node:path";
import { describe, expect, test } from "vitest";

const templateMdast = templateMdastJson as WikiMdastRoot;

describe(`mdx files exist and are valid`, async () => {
  const mdxFiles = await glob(
    path.join(projectRoot, `src/client/wiki/**/*.mdx`),
  );

  test(`finds MDX files`, () => {
    expect(mdxFiles.length).toBeGreaterThan(100);
  });

  test(`sample MDX files have expected structure`, () => {
    const sampleFiles = mdxFiles.slice(0, 20);

    for (const filePath of sampleFiles) {
      const content = readFileSync(filePath, `utf8`);
      const relativePath = path.relative(projectRoot, filePath);

      expect(
        content.trim().length > 0,
        `File ${relativePath} should have content`,
      ).toBe(true);
      expect(relativePath).toMatch(/src\/client\/wiki\/.+\/.+\.mdx$/u);
    }
  });
});

describe(`mdast rendering`, () => {
  test(`renders generated template mdast from local json fixture`, () => {
    render(
      <PylyMdxComponents>
        <MDXComponents
          components={{
            CustomComponent,
            CustomWrapper,
            Separator,
          }}
        >
          <MdastContent root={templateMdast} />
        </MDXComponents>
      </PylyMdxComponents>,
    );

    expect(screen.getByText(`Heading 1`)).toBeInTheDocument();
    expect(screen.getByText(`highlighted text`)).toBeInTheDocument();
    expect(screen.getByText(`Hello from CustomComponent`)).toBeInTheDocument();
  });
});
