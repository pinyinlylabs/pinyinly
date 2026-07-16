import { ExampleStack } from "@/client/ui/demo/components";
import { ImageCloud } from "@/client/ui/ImageCloud";

export default () => {
  return (
    <>
      <ExampleStack title="415×320" showFrame>
        <ImageCloud className="h-80 w-[415px]" />
      </ExampleStack>
      <ExampleStack title="300×200" showFrame>
        <ImageCloud className="h-50 w-75" />
      </ExampleStack>
    </>
  );
};
