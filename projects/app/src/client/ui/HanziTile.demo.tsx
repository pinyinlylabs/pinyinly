import { ExampleStack } from "@/client/ui/demo/helpers";
import type { HanziText } from "@/data/model";
import { Text, View } from "react-native";
import { HanziTile } from "./HanziTile";

export default () => (
  <View className="max-w-full gap-4">
    {([`outline`, `filled`] as const).map((variant) => (
      <View key={variant} className="items-start">
        <Text className="pyly-dev-dt">variant={variant}</Text>
        <ExampleStack title="character" childrenClassName="gap-2">
          <View className="flex-row flex-wrap gap-2">
            <HanziTile hanzi={`好` as HanziText} variant={variant} size="xl" />
            <HanziTile
              hanzi={`好` as HanziText}
              pinyin="hǎo"
              variant={variant}
              size="xl"
            />
            <HanziTile
              hanzi={`好` as HanziText}
              gloss="good"
              variant={variant}
              size="xl"
            />
            <HanziTile
              hanzi={`好` as HanziText}
              gloss="good"
              pinyin="hǎo"
              variant={variant}
              size="xl"
            />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <HanziTile
              hanzi={`好` as HanziText}
              variant={variant}
              size="normal"
            />
            <HanziTile
              hanzi={`好` as HanziText}
              pinyin="hǎo"
              variant={variant}
              size="normal"
            />
            <HanziTile
              hanzi={`好` as HanziText}
              gloss="good"
              variant={variant}
              size="normal"
            />
            <HanziTile
              hanzi={`好` as HanziText}
              gloss="good"
              pinyin="hǎo"
              variant={variant}
              size="normal"
            />
          </View>
        </ExampleStack>

        <ExampleStack title="word" childrenClassName="gap-2">
          <View className="flex-row flex-wrap gap-2">
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="xl"
            />
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="xl"
              pinyin="nǐhǎo"
            />
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="xl"
              gloss="hello"
            />
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="xl"
              pinyin="nǐhǎo"
              gloss="hello"
            />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="normal"
            />
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="normal"
              pinyin="nǐhǎo"
            />
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="normal"
              gloss="hello"
            />
            <HanziTile
              hanzi={`你好` as HanziText}
              variant={variant}
              size="normal"
              pinyin="nǐhǎo"
              gloss="hello"
            />
          </View>
        </ExampleStack>
      </View>
    ))}
  </View>
);
