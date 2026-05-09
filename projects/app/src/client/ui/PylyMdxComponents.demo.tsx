import { ExampleStack } from "@/client/ui/demo/components";
import type { WikiMdastRoot } from "@/client/query";
import { MDXComponents } from "./MDXComponents";
import { MdastContent } from "./MdastContent";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { CustomComponent, CustomWrapper, Separator } from "./demo/mdx/helpers";
import templateMdast from "./demo/mdx/template.mdast.json";

const templateMdastRoot = templateMdast as unknown as WikiMdastRoot;

export default () => {
  return (
    <PylyMdxComponents>
      <ExampleStack title="MDX content" showFrame>
        <MDXComponents
          components={{
            CustomComponent,
            CustomWrapper,
            Separator,
          }}
        >
          <MdastContent root={templateMdastRoot} />
        </MDXComponents>
      </ExampleStack>
    </PylyMdxComponents>
  );
};
