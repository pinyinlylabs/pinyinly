import { ScrollView, Text, View } from "react-native";

import { RectButton2 } from "@/client/ui/RectButton2";
import { Link } from "expo-router";
import { tv } from "tailwind-variants";

export default function ExplorePage() {
  return (
    <ScrollView contentContainerClassName="pt-safe-offset-4 px-safe-or-4 items-center gap-[10px] padding-[10px]">
      <View className={boxClass()}>
        <Text className={boxTitleClass()}>Mnemonics</Text>
        <Text className="hhh-text-caption mb-4">
          Turn characters into stories. Each Chinese character has a unique
          story that ties together its meaning, pronunciation, and
          components—making learning intuitive and recall effortless.
        </Text>

        <Link href="/explore/mnemonics/" asChild>
          <RectButton2 variant="filled" className="accent-theme2 self-start">
            Explore mnemonics
          </RectButton2>
        </Link>
      </View>

      <View className={boxClass()}>
        <Text className={boxTitleClass()}>Radicals</Text>
        <Text className="hhh-text-caption mb-4">
          Radicals are the key to recognizing and understanding characters.
          Learn them with memorable stories to boost your reading and recall.
        </Text>

        <Link href="/explore/radicals" asChild>
          <RectButton2 variant="filled" className="accent-theme2 self-start">
            Explore radicals
          </RectButton2>
        </Link>
      </View>

      <View className={boxClass()}>
        <Text className={boxTitleClass()}>Words</Text>
        <Text className="hhh-text-caption mb-4">
          Learn how Chinese characters come together to form words, understand
          their meanings, and see them in context to reinforce retention.
        </Text>

        <Link href="/explore/words" asChild>
          <RectButton2 variant="filled" className="accent-theme2 self-start">
            Explore words
          </RectButton2>
        </Link>
      </View>
    </ScrollView>
  );
}

const boxClass = tv({
  base: `
    w-full overflow-hidden rounded-xl bg-primary-3 p-4

    md:max-w-[400px]
  `,
});

const boxTitleClass = tv({
  base: `hhh-text-title mb-1`,
});
