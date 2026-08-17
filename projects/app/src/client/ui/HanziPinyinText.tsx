import type { HanziText, PinyinText } from "@/data/model";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export function HanziPinyinText({
  hanzi,
  pinyin,
  className = ``,
  lozenges,
}: {
  hanzi: HanziText;
  pinyin?: PinyinText | null;
  className?: string;
  lozenges?: React.ReactNode;
}) {
  const isSingleCharacter = hanzi.length === 1;

  return (
    <View
      className={[containerClass({ isSingleCharacter }), className]
        .filter(Boolean)
        .join(` `)}
    >
      {isSingleCharacter ? (
        <>
          <Text className={hanziTextClass({ isSingleCharacter })}>{hanzi}</Text>
          {pinyin == null ? null : (
            <Text className={pinyinTextClass({ isSingleCharacter })}>
              {pinyin}
            </Text>
          )}
          {lozenges}
        </>
      ) : (
        <>
          <View className="flex-row items-center gap-3">
            <Text className={hanziTextClass({ isSingleCharacter })}>
              {hanzi}
            </Text>
            {lozenges}
          </View>
          {pinyin == null ? null : (
            <Text className={pinyinTextClass({ isSingleCharacter })}>
              {pinyin}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const containerClass = tv({
  variants: {
    isSingleCharacter: {
      false: `gap-0`,
      true: `flex-row items-center gap-3`,
    },
  },
});

const hanziTextClass = tv({
  base: `font-sans font-normal text-fg-loud`,
  variants: {
    isSingleCharacter: {
      false: `text-2xl`,
      true: `text-3xl`,
    },
  },
});

const pinyinTextClass = tv({
  base: `font-sans text-muted-fg`,
  variants: {
    isSingleCharacter: {
      false: `text-sm`,
      true: `text-base`,
    },
  },
});
