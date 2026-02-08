import { ExampleStack } from "@/client/ui/demo/helpers";
import { IconImage, iconNames } from "@/client/ui/IconImage";
import { View } from "react-native";

export default () => {
  const icons = ([12, 24, 32] as const).map((size, i) => (
    <View key={i} className="max-w-[200px] flex-row flex-wrap">
      {iconNames.map((iconName, i) => (
        <IconImage key={i} size={size} icon={iconName} />
      ))}
    </View>
  ));
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default" childrenClassName="gap-8">
        {icons}
      </ExampleStack>

      <ExampleStack
        title="wasabi"
        childrenClassName={`
          gap-8

          [--color-fg:var(--color-success)]
        `}
      >
        {icons}
      </ExampleStack>

      <ExampleStack
        title="brick"
        childrenClassName={`
          gap-8

          [--color-fg:var(--color-danger)]
        `}
      >
        {icons}
      </ExampleStack>
    </View>
  );
};
