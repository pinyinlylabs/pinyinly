import { ExampleStack } from "@/client/ui/demo/components";
import Template from "./demo/mdx/template.mdx";
import { PylyMdxComponents } from "./PylyMdxComponents";

export default () => {
  return (
    <PylyMdxComponents>
      <ExampleStack title="MDX content" showFrame>
        <Template />
      </ExampleStack>
    </PylyMdxComponents>
  );
};
