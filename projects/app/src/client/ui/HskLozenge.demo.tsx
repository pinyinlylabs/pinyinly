import { HskLevel } from "@/data/model";
import { Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";

const hskLevels = [
  HskLevel[`1`],
  HskLevel[`2`],
  HskLevel[`3`],
  HskLevel[`4`],
  HskLevel[`5`],
  HskLevel[`6`],
  HskLevel[`7-9`],
];

export default () => {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-sans text-sm text-fg-dim">Medium</Text>
        <View className="flex-row flex-wrap gap-2">
          {hskLevels.map((hskLevel) => (
            <HskLozenge hskLevel={hskLevel} key={`md-${hskLevel}`} />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Text className="font-sans text-sm text-fg-dim">Small</Text>
        <View className="flex-row flex-wrap gap-2">
          {hskLevels.map((hskLevel) => (
            <HskLozenge hskLevel={hskLevel} key={`sm-${hskLevel}`} size="sm" />
          ))}
        </View>
      </View>
    </View>
  );
};
