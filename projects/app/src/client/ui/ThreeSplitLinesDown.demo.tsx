import { ExampleStack } from "@/client/ui/demo/helpers";
import { RectButton } from "@/client/ui/RectButton";
import { ThreeSplitLinesDown } from "@/client/ui/ThreeSplitLinesDown";
import { useState } from "react";
import { View } from "react-native";

export default () => {
  const [growth, setGrowth] = useState(0);

  return (
    <View className="flex-row">
      <ExampleStack title="static (125×75)" showFrame>
        <ThreeSplitLinesDown className="h-[75px] w-[125px]" />
      </ExampleStack>

      <View>
        <ExampleStack title="resizable (100×50)" showFrame>
          <ThreeSplitLinesDown
            style={{ width: 100 + growth, height: 50 + growth }}
          />
        </ExampleStack>
        <View className="shrink flex-row">
          <RectButton
            variant="bare"
            onPress={() => {
              setGrowth((prev) => prev - 5);
            }}
          >
            Shrink
          </RectButton>
          <RectButton
            variant="bare"
            onPress={() => {
              setGrowth((prev) => prev + 5);
            }}
          >
            Grow
          </RectButton>
        </View>
      </View>
    </View>
  );
};
