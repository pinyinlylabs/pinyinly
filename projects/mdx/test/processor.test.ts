import { createMdxAstProcessor } from "@pinyinly/mdx/processor";
import { describe, expect, test } from "vitest";

describe(`createMdxAstProcessor`, () => {
  test(`parses ==foo== as a highlight node`, async () => {
    const processor = createMdxAstProcessor();
    const parsed = processor.parse(`==highlighted text==`);
    const tree = await processor.run(parsed);

    expect(tree).toMatchObject({
      type: `root`,
      children: [
        {
          type: `paragraph`,
          children: [
            {
              type: `mark`,
              children: [{ type: `text`, value: `highlighted text` }],
            },
          ],
        },
      ],
    });
  });

  test(`parses GFM strikethrough`, async () => {
    const processor = createMdxAstProcessor();
    const parsed = processor.parse(`~~deleted~~`);
    const tree = await processor.run(parsed);

    expect(tree).toMatchObject({
      type: `root`,
      children: [
        {
          type: `paragraph`,
          children: [
            { type: `delete`, children: [{ type: `text`, value: `deleted` }] },
          ],
        },
      ],
    });
  });

  test(`parses MDX JSX elements`, async () => {
    const processor = createMdxAstProcessor();
    const parsed = processor.parse(`<CustomComponent />`);
    const tree = await processor.run(parsed);

    expect(tree).toMatchObject({
      type: `root`,
      children: [{ type: `mdxJsxFlowElement`, name: `CustomComponent` }],
    });
  });

  test(`parses plain text without modification`, async () => {
    const processor = createMdxAstProcessor();
    const parsed = processor.parse(`Hello world`);
    const tree = await processor.run(parsed);

    expect(tree).toMatchObject({
      type: `root`,
      children: [
        {
          type: `paragraph`,
          children: [{ type: `text`, value: `Hello world` }],
        },
      ],
    });
  });
});
