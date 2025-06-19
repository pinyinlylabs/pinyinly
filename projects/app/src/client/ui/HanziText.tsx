import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export const HanziText = ({
  pinyin,
  hanzi,
  small = false,
  underline = false,
}: {
  pinyin?: string;
  hanzi: string;
  small?: boolean;
  underline?: boolean;
}) => {
  return (
    <View
      className={`
        flex-col items-center

        ${small ? `gap-0.5` : `gap-1`}
      `}
    >
      {pinyin == null ? null : <PinyinText pinyin={pinyin} small={small} />}
      <Text className={hanziText({ small, underline })}>{hanzi}</Text>
    </View>
  );
};

const hanziText = tv({
  base: `text-2xl/none text-fg`,

  variants: {
    small: {
      true: `text-xl/none`,
    },
    underline: {
      true: `underline decoration-dashed decoration-2 underline-offset-[6px]`,
    },
  },
});

export const PinyinText = ({
  pinyin,
  small = false,
}: {
  pinyin: string;
  small?: boolean;
}) => {
  return <Text className={pinyinText({ small })}>{pinyin}</Text>;
};

const pinyinText = tv({
  base: `text-base/none text-primary-9`,
  variants: {
    small: {
      true: `text-xs/none`,
    },
  },
});
