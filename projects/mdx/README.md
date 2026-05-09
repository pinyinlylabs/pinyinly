# @pinyinly/mdx

Shared MDX processing utilities for Pinyinly projects.

## Usage

Create an AST processor:

```typescript
import { createMdxAstProcessor } from "@pinyinly/mdx/processor";

const processor = createMdxAstProcessor();

const parsed = processor.parse({
  value: `==highlighted text==`,
  path: `example.mdx`,
});

const transformedTree = await processor.run(parsed);
```

## Features

- Canonical MDX processor configuration shared across code paths
- Flexible marker support (`==highlighted text==`)
- GFM support
- Vite plugin support via `@pinyinly/mdx/vite`
