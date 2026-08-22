import { PylymarkTypewriter } from "@/client/ui/PylymarkTypewriter";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

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
          <Text className="w-32 text-right pyly-dev-dt">{textClass}</Text>
          <Text
            className={`
              w-[250px]

              ${textClass}
            `}
          >
            <PylymarkTypewriter source="Some **bold text** and *italic text* and {好:good} and ==mark text== and another line of plain text." />
          </Text>
        </View>
      ))}
    </View>
  );
};
