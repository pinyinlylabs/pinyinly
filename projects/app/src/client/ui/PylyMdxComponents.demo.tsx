import { PylyMdxComponents } from "./PylyMdxComponents";
import { ExampleStack } from "./demo/helpers";
import Template from "./demo/mdx/template.mdx";

export default () => {
  return (
    <PylyMdxComponents>
      <ExampleStack title="MDX content" showFrame>
        <Template />
      </ExampleStack>
    </PylyMdxComponents>
  );
};
