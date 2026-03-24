import { ExampleStack } from "@/client/ui/demo/components";
import { ShimmerRect } from "@/client/ui/ShimmerRect";
import { View } from "react-native";

export default () => {
  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="small" childrenClassName="gap-3">
          <ShimmerRect className="size-9 rounded-md" />
          <ShimmerRect className="size-14 rounded-lg" />
        </ExampleStack>

        <ExampleStack title="card" childrenClassName="gap-3">
          <ShimmerRect className="h-[110px] w-[180px] rounded-md" />
          <ShimmerRect className="h-[110px] w-[220px] rounded-md" />
        </ExampleStack>

        <ExampleStack title="wide" childrenClassName="gap-3 w-[320px]">
          <ShimmerRect className="aspect-[2/1] w-full rounded-lg" />
          <ShimmerRect className="h-[56px] w-full rounded-lg" />
        </ExampleStack>
      </View>
    </View>
  );
};
