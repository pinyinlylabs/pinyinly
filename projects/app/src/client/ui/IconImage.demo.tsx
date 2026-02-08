import { ExampleStack } from "@/client/ui/demo/helpers";
import { IconImage } from "@/client/ui/IconImage";
import { View } from "react-native";

export default () => {
  const icons = [`book`, `cart`, `flag`, `home`] as const;
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="size=12">
        {icons.map((icon) => (
          <IconImage key={icon} size={12} icon={icon} />
        ))}
      </ExampleStack>

      <ExampleStack title="default">
        {icons.map((icon) => (
          <IconImage key={icon} icon={icon} />
        ))}
      </ExampleStack>

      <ExampleStack title="size=32">
        {icons.map((icon) => (
          <IconImage key={icon} size={32} icon={icon} />
        ))}
      </ExampleStack>

      <View className="[--color-fg:var(--color-success)]">
        <ExampleStack title="success">
          {icons.map((icon) => (
            <IconImage key={icon} icon={icon} />
          ))}
        </ExampleStack>
      </View>

      <View className="[--color-fg:var(--color-warning)]">
        <ExampleStack title="warning">
          {icons.map((icon) => (
            <IconImage key={icon} icon={icon} />
          ))}
        </ExampleStack>
      </View>
    </View>
  );
};
