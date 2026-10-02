import { ExampleStack } from "@/client/ui/demo/components";
import { ShimmerRect } from "@/client/ui/ShimmerRect";
import { View } from "@/client/ui/View";

export default () => {
  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="small" childrenClassName="gap-3">
          <ShimmerRect className="size-9 rounded-md" />
          <ShimmerRect className="size-14 rounded-lg" />
        </ExampleStack>

        <ExampleStack title="card" childrenClassName="gap-3">
          <ShimmerRect className="h-[110px] w-45 rounded-md" />
          <ShimmerRect className="h-[110px] w-55 rounded-md" />
        </ExampleStack>

        <ExampleStack title="wide" childrenClassName="w-[320px] gap-3">
          <ShimmerRect className="aspect-[2/1] w-full rounded-lg" />
          <ShimmerRect className="h-14 w-full rounded-lg" />
        </ExampleStack>
      </View>
    </View>
  );
};
