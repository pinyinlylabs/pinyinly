import { Pylymark } from "@/client/ui/Pylymark";
import { Text, View } from "react-native";

export default () => {
  return (
    <View className="gap-2">
      {(
        [
          `pyly-body-title`,
          `pyly-body-2xl`,
          `pyly-body`,
          `pyly-body-caption`,
        ] as const
      ).map((textClass) => (
        <View className="flex-row items-center gap-2" key={textClass}>
          <Text className="pyly-dev-dt w-[128px] text-right">{textClass}</Text>
          <Text
            className={`
              w-[250px]

              ${textClass}
            `}
          >
            <Pylymark source="Some **bold text** and *italic text* and {好:good} and ==mark text== and another line of plain text." />
          </Text>
        </View>
      ))}
    </View>
  );
};
