import { Hhhmark } from "@/client/ui/Hhhmark";
import { Text, View } from "react-native";

export default () => {
  return (
    <View className="gap-2">
      {(
        [
          `hhh-body-title`,
          `hhh-body-2xl`,
          `hhh-body`,
          `hhh-body-caption`,
        ] as const
      ).map((textClass) => (
        <View className="flex-row items-center gap-2" key={textClass}>
          <Text className="hhh-dev-dt w-[128px] text-right">{textClass}</Text>
          <Text
            className={`
              w-[250px]

              ${textClass}
            `}
          >
            <Hhhmark source="Some **bold text** and *italic text* and {好:good} and another line of plain text." />
          </Text>
        </View>
      ))}
    </View>
  );
};
