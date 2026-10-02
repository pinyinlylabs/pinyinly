import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { Icon } from "./Icon";
import { RectButton } from "./RectButton";
import { ExampleStack } from "./demo/components";
import { Theme } from "./Theme";
import { themeNames } from "./demo/utils";

export default () => {
  return (
    <View>
      {[undefined, ...themeNames].map((theme) => (
        <Theme theme={theme} key={theme ?? `default`}>
          <ExampleStack
            title={theme ?? `default`}
            childrenClassName={`gap-1 px-2 py-1`}
          >
            <ThemeExamples />
          </ExampleStack>
        </Theme>
      ))}
    </View>
  );
};

function ThemeExamples() {
  return (
    <>
      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-bg" />
        <Text className="font-mono text-fg">bg</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-bg-high" />
        <Text className="font-mono text-fg">bg-high</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-fg" />
        <Text className="font-mono text-fg">fg</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-fg-loud" />
        <Text className="font-mono text-fg">fg-loud</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-accent" />
        <Text className="font-mono text-fg">accent</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-accent-fg" />
        <Text className="font-mono text-fg">accent-fg</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-muted" />
        <Text className="font-mono text-fg">muted</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-muted-fg" />
        <Text className="font-mono text-fg">muted-fg</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-destructive" />
        <Text className="font-mono text-fg">destructive</Text>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="size-6 bg-destructive-fg" />
        <Text className="font-mono text-fg">destructive-fg</Text>
      </View>

      <View className="mt-2 w-[245px] gap-2 bg-bg px-3 py-2">
        <View className="flex-row items-center gap-2">
          <Icon icon="check-circled-filled" size={32} />
          <Text className="pyly-body-title">
            Title <Text className="pyly-bold">loud</Text>
          </Text>
        </View>
        <Text
          className={`
            self-start rounded bg-bg-high px-2 py-1 font-sans text-[10px] leading-normal font-bold
            text-fg
          `}
        >
          BG-HIGH
        </Text>
        <Text className="pyly-body">
          Body text uses fg then{` `}
          <Text className="pyly-bold">fg-loud for loud</Text> text.
        </Text>
        <RectButton variant="filled" className={`self-start`}>
          早饭
        </RectButton>
        <Text className="pyly-body-caption">
          Caption text uses muted-fg and then{` `}
          <Text className="pyly-bold">fg for loud</Text> text.
        </Text>
      </View>
    </>
  );
}
