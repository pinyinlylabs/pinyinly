import { ExampleStack } from "@/client/ui/demo/helpers";
import { IconImage } from "@/client/ui/IconImage";
import { View } from "react-native";

export default () => {
  const sources = [
    require(`@/assets/icons/book.svg`),
    require(`@/assets/icons/cart.svg`),
    require(`@/assets/icons/flag.svg`),
    require(`@/assets/icons/home.svg`),
  ];
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="size=12">
        {sources.map((s, i) => (
          <IconImage key={i} size={12} source={s} />
        ))}
      </ExampleStack>

      <ExampleStack title="default">
        {sources.map((s, i) => (
          <IconImage key={i} source={s} />
        ))}
      </ExampleStack>

      <ExampleStack title="size=32">
        {sources.map((s, i) => (
          <IconImage key={i} size={32} source={s} />
        ))}
      </ExampleStack>

      <View className="[--color-fg:var(--color-success)]">
        <ExampleStack title="success">
          {sources.map((s, i) => (
            <IconImage key={i} source={s} />
          ))}
        </ExampleStack>
      </View>

      <View className="[--color-fg:var(--color-warning)]">
        <ExampleStack title="warning">
          {sources.map((s, i) => (
            <IconImage key={i} source={s} />
          ))}
        </ExampleStack>
      </View>
    </View>
  );
};
