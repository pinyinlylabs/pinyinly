import { ExampleStack } from "@/client/ui/demo/components";
import { ShimmerText } from "@/client/ui/ShimmerText";
import { View } from "react-native";

export default () => {
  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="default" childrenClassName="gap-3">
          <ShimmerText>Working...</ShimmerText>
        </ExampleStack>

        <ExampleStack title="small" childrenClassName="gap-3">
          <ShimmerText className="font-sans text-[12px] text-fg-dim">
            Loading...
          </ShimmerText>
        </ExampleStack>

        <ExampleStack title="large" childrenClassName="gap-3">
          <ShimmerText className="font-sans text-[18px] font-semibold text-fg-dim">
            Generating image...
          </ShimmerText>
        </ExampleStack>

        <ExampleStack title="long text" childrenClassName="gap-3">
          <ShimmerText className="font-sans text-[14px] text-fg-dim">
            Processing your request, please wait...
          </ShimmerText>
        </ExampleStack>
      </View>
    </View>
  );
};
