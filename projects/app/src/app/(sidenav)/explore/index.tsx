import { RectButton } from "@/client/ui/RectButton";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function ExplorePage() {
  return (
    <ScrollView
      contentContainerClassName={`
        pt-safe-offset-4 px-safe-or-4 items-center gap-[10px] padding-[10px]
      `}
    >
      <View className={boxClass()}>
        <Text className={boxTitleClass()}>Mnemonics</Text>
        <Text className="pyly-body-caption mb-4">
          Turn characters into stories. Each Chinese character has a unique
          story that ties together its meaning, pronunciation, and
          components—making learning intuitive and recall effortless.
        </Text>

        <Link href="/explore/sounds/" asChild>
          <RectButton variant="filled" className="theme-accent self-start">
            Explore sounds
          </RectButton>
        </Link>
      </View>

      <View className={boxClass()}>
        <Text className={boxTitleClass()}>Radicals</Text>
        <Text className="pyly-body-caption mb-4">
          Radicals are the key to recognizing and understanding characters.
          Learn them with memorable stories to boost your reading and recall.
        </Text>
      </View>

      <View className={boxClass()}>
        <Text className={boxTitleClass()}>Words</Text>
        <Text className="pyly-body-caption mb-4">
          Learn how Chinese characters come together to form words, understand
          their meanings, and see them in context to reinforce retention.
        </Text>
      </View>
    </ScrollView>
  );
}

const boxClass = tv({
  base: `
    w-full overflow-hidden rounded-xl bg-bg p-4

    md:max-w-[400px]
  `,
});

const boxTitleClass = tv({
  base: `pyly-body-title mb-1`,
});
