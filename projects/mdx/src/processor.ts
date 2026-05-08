import remarkMdx from "remark-mdx";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export function createMdxAstProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkFlexibleMarkers, { markerClassName: `pyly-mdx-mark` })
    .use(remarkGfm);
}
