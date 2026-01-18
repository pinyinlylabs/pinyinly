import { Text, View } from "react-native";
import { ExampleStack } from "./demo/helpers";
import { IconImage } from "./IconImage";
import { RectButton } from "./RectButton";

export default () => {
  const themeClasses = [
    `theme-default`,
    `theme-danger-panel`,
    `theme-success-panel`,
    `theme-warning-panel`,
    `theme-grass-panel`,
    `theme-sky-panel`,
  ];

  return (
    <View>
      {themeClasses.map((themeClass) => (
        <ExampleStack
          title={themeClass}
          key={themeClass}
          childrenClassName={`
            px-2 py-1 gap-1

            ${themeClass}
          `}
        >
          <ThemeExamples />
        </ExampleStack>
      ))}
    </View>
  );
};

function ThemeExamples() {
  return (
    <>
      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-fg-dim" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          fg-dim
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-fg" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          fg
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-fg-loud" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          fg-loud
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-bg" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          bg
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-bg-high" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          bg-high
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-bg-higher" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          bg-higher
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-on-fg" />
        <Text className="font-mono text-[var(--color-theme-default-fg)]">
          on-fg
        </Text>
      </View>

      <View className="mt-2 w-[245px] gap-2 bg-bg px-3 py-2">
        <View className="flex-row items-center gap-2">
          <IconImage
            source={require(`@/assets/icons/check-circled-filled.svg`)}
            size={32}
            className="text-fg"
          />
          <Text className="pyly-body-title">
            Title <Text className="pyly-bold">loud</Text>
          </Text>
        </View>
        <Text
          className={`
            self-start rounded bg-bg-high px-2 py-1 font-sans text-[10px] font-bold leading-normal
            text-fg
          `}
        >
          BG-HIGH
        </Text>
        <Text
          className={`
            self-start rounded bg-bg-higher px-2 py-1 font-sans text-[10px] font-bold leading-normal
            text-fg
          `}
        >
          BG-HIGHER
        </Text>
        <Text className="pyly-body">
          Body text uses fg then{` `}
          <Text className="pyly-bold">fg-loud for loud</Text> text.
        </Text>
        <RectButton variant="filled" className={`self-start`}>
          早饭
        </RectButton>
        <Text className="pyly-body-caption">
          Caption text uses fg-dim and then{` `}
          <Text className="pyly-bold">fg for loud</Text> text.
        </Text>
      </View>
    </>
  );
}
