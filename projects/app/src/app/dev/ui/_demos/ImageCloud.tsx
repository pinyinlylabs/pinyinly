import { ExampleStack } from "@/app/dev/ui/_helpers";
import { ImageCloud } from "@/client/ui/ImageCloud";

export default () => {
  return (
    <>
      <ExampleStack title="415×320" showFrame>
        <ImageCloud className="h-[320px] w-[415px]" />
      </ExampleStack>
      <ExampleStack title="300×200" showFrame>
        <ImageCloud className="h-[200px] w-[300px]" />
      </ExampleStack>
    </>
  );
};
