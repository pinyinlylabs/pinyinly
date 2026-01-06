import { ExampleStack } from "@/client/ui/demo/helpers";
import type { HanziText, PinyinText } from "@/data/model";
import { View } from "react-native";
import type { HanziTileProps } from "./HanziTile";
import { HanziTile } from "./HanziTile";

export default () => (
  <View className="max-w-full gap-4">
    {([[`outline`], [`filled`], [`filled`]] as const).map(([variant]) => (
      <ExampleStack
        key={variant}
        title={`Pinyin text sizing (${variant})`}
        childrenClassName="gap-2"
      >
        {([`47`, `20`, `10`] as HanziTileProps[`size`][]).map((size) => (
          <View className="flex-row flex-wrap gap-2" key={size}>
            {[1, 5, 12, 25, 40].map((length) => (
              <HanziTile
                key={length}
                hanzi={`好` as HanziText}
                gloss={`hello`}
                pinyin={`xxx `.repeat(20).slice(0, length) as PinyinText}
                variant={variant}
                size={size}
              />
            ))}
          </View>
        ))}
      </ExampleStack>
    ))}

    {([[`outline`], [`filled`], [`filled`]] as const).map(([variant]) => (
      <ExampleStack
        key={variant}
        title={`Hanzi text sizing (${variant})`}
        childrenClassName="gap-2"
      >
        {([`47`, `20`, `10`] as HanziTileProps[`size`][]).map((size) => (
          <View className="flex-row flex-wrap gap-2" key={size}>
            {[1, 2, 3, 4, 5, 6, 7].map((length) => (
              <HanziTile
                key={length}
                hanzi={`好`.repeat(length) as HanziText}
                gloss={`xxxxx`}
                pinyin={`hǎo` as PinyinText}
                variant={variant}
                size={size}
              />
            ))}
          </View>
        ))}
      </ExampleStack>
    ))}

    {([[`outline`], [`filled`], [`filled`]] as const).map(([variant]) => (
      <ExampleStack
        key={variant}
        title="Gloss text sizing"
        childrenClassName="gap-2"
      >
        {([`47`, `20`, `10`] as HanziTileProps[`size`][]).map((size) => (
          <View className="flex-row flex-wrap gap-2" key={size}>
            {[1, 5, 10, 20, 30, 45, 50].map((length) => (
              <HanziTile
                key={length}
                hanzi={`好` as HanziText}
                gloss={`xxx `.repeat(20).slice(0, length)}
                pinyin={`hǎo` as PinyinText}
                variant={variant}
                size={size}
              />
            ))}
          </View>
        ))}
      </ExampleStack>
    ))}

    {(
      [
        {
          title: `character`,
          hanzi: `好` as HanziText,
          gloss: `good`,
          pinyin: `hǎo` as PinyinText,
        },
        {
          title: `word`,
          hanzi: `你好` as HanziText,
          gloss: `hello`,
          pinyin: `nǐhǎo` as PinyinText,
        },
        {
          title: `character (long gloss)`,
          hanzi: `几` as HanziText,
          gloss: `very small table`,
          pinyin: `jī` as PinyinText,
        },
        {
          title: `word (long gloss)`,
          hanzi: `前天` as HanziText,
          gloss: `the day before yesterday`,
          pinyin: `qiántiān` as PinyinText,
        },
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
                  pinyin={config.pinyin}
                  variant={variant}
                  size={size}
                  progress={progress}
                />
                <HanziTile
                  hanzi={config.hanzi}
                  gloss={config.gloss}
                  variant={variant}
                  size={size}
                  progress={progress}
                />
                <HanziTile
                  hanzi={config.hanzi}
                  gloss={config.gloss}
                  pinyin={config.pinyin}
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
