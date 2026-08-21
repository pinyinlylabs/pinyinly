import { Hsk3Level } from "@/data/model";
import { Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";

const hskLevels = [
  Hsk3Level[`1`],
  Hsk3Level[`2`],
  Hsk3Level[`3`],
  Hsk3Level[`4`],
  Hsk3Level[`5`],
  Hsk3Level[`6`],
  Hsk3Level[`7-9`],
];

export default () => {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-sans text-sm text-muted-fg">Medium</Text>
        <View className="flex-row flex-wrap gap-2">
          {hskLevels.map((hskLevel) => (
            <HskLozenge hskLevel={hskLevel} key={`md-${hskLevel}`} />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Text className="font-sans text-sm text-muted-fg">Small</Text>
        <View className="flex-row flex-wrap gap-2">
          {hskLevels.map((hskLevel) => (
            <HskLozenge hskLevel={hskLevel} key={`sm-${hskLevel}`} size="sm" />
          ))}
        </View>
      </View>
    </View>
  );
};
