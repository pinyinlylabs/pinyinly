import { Hsk30Level } from "@/data/model";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { HskLozenge } from "./HskLozenge";

const hskLevels = [
  Hsk30Level[`1`],
  Hsk30Level[`2`],
  Hsk30Level[`3`],
  Hsk30Level[`4`],
  Hsk30Level[`5`],
  Hsk30Level[`6`],
  Hsk30Level[`7-9`],
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
