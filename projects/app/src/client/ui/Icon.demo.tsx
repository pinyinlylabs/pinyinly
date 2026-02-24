import { ExampleStack } from "@/client/ui/demo/components";
import { Icon } from "@/client/ui/Icon";
import { View } from "react-native";
import { iconNames } from "./iconRegistry";

export default () => {
  const fewIcons = [`book`, `cart`, `flag`, `home`] as const;

  const allIcons = ([12, 20, 24, 32] as const).map((size, i) => (
    <View key={i} className="max-w-[200px] flex-row flex-wrap">
      {iconNames.map((iconName, i) => (
        <Icon key={i} size={size} icon={iconName} />
      ))}
    </View>
  ));

  return (
    <View className="gap-2">
      <View className="w-full flex-row gap-2">
        <ExampleStack title="size=12">
          {fewIcons.map((icon) => (
            <Icon key={icon} size={12} icon={icon} />
          ))}
        </ExampleStack>

        <ExampleStack title="default">
          {fewIcons.map((icon) => (
            <Icon key={icon} icon={icon} />
          ))}
        </ExampleStack>

        <ExampleStack title="size=32">
          {fewIcons.map((icon) => (
            <Icon key={icon} size={32} icon={icon} />
          ))}
        </ExampleStack>

        <View className="[--color-fg:var(--color-success)]">
          <ExampleStack title="success">
            {fewIcons.map((icon) => (
              <Icon key={icon} icon={icon} />
            ))}
          </ExampleStack>
        </View>

        <View className="[--color-fg:var(--color-warning)]">
          <ExampleStack title="warning">
            {fewIcons.map((icon) => (
              <Icon key={icon} icon={icon} />
            ))}
          </ExampleStack>
        </View>
      </View>

      <View className="w-full flex-row gap-2">
        <ExampleStack title="default" childrenClassName="gap-8">
          {allIcons}
        </ExampleStack>

        <ExampleStack
          title="wasabi"
          childrenClassName={`
            gap-8

            [--color-fg:var(--color-success)]
          `}
        >
          {allIcons}
        </ExampleStack>

        <ExampleStack
          title="brick"
          childrenClassName={`
            gap-8

            [--color-fg:var(--color-danger)]
          `}
        >
          {allIcons}
        </ExampleStack>
      </View>
    </View>
  );
};
