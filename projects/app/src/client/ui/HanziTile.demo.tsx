import { ExampleStack } from "@/client/ui/demo/helpers";
import type { HanziText } from "@/data/model";
import { View } from "react-native";
import type { HanziTileProps } from "./HanziTile";
import { HanziTile } from "./HanziTile";

export default () => (
  <View className="max-w-full gap-4">
    {(
      [
        { title: `character`, hanzi: `好` as HanziText, pinyin: `hǎo` },
        { title: `word`, hanzi: `你好` as HanziText, pinyin: `nǐhǎo` },
      ] as const
    ).map((config, i) => (
      <View key={i}>
        {(
          [
            [`outline`, undefined],
            [`filled`, undefined],
            [`filled`, 0.2],
          ] as const
        ).map(([variant, progress]) => (
          <ExampleStack
            key={`${variant}-${progress ?? ``}`}
            title={`${config.title} (${variant}${progress == null ? `` : `, ${progress * 100}%`})`}
            childrenClassName="gap-2"
          >
            {([`47`, `20`, `10`] as HanziTileProps[`size`][]).map((size) => (
              <View className="flex-row flex-wrap gap-2" key={size}>
                <HanziTile
                  hanzi={config.hanzi}
                  variant={variant}
                  size={size}
                  progress={progress}
                />
                <HanziTile
                  hanzi={config.hanzi}
                  pinyin="hǎo"
                  variant={variant}
                  size={size}
                  progress={progress}
                />
                <HanziTile
                  hanzi={config.hanzi}
                  gloss="good"
                  variant={variant}
                  size={size}
                  progress={progress}
                />
                <HanziTile
                  hanzi={config.hanzi}
                  gloss="good"
                  pinyin="hǎo"
                  variant={variant}
                  size={size}
                  progress={progress}
                />
              </View>
            ))}
          </ExampleStack>
        ))}
      </View>
    ))}
  </View>
);
