import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export const HanziText = ({
  pinyin,
  hanzi,
  accented,
  small = false,
  underline = false,
}: {
  pinyin?: string;
  hanzi: string;
  accented?: boolean;
  small?: boolean;
  underline?: boolean;
}) => {
  return (
    <View
      className={`flex-0 flex-col items-center ${small ? `gap-0.5` : `gap-1`}`}
    >
      {pinyin == null ? null : (
        <PinyinText pinyin={pinyin} accented={accented} small={small} />
      )}
      <Text className={hanziText({ accented, small, underline })}>{hanzi}</Text>
    </View>
  );
};

const hanziText = tv({
  base: `text-2xl/none text-body`,

  variants: {
    accented: {
      true: `text-accent-10`,
    },
    small: {
      true: `text-xl/none`,
    },
    underline: {
      true: `underline decoration-dashed decoration-[2px] underline-offset-[6px]`,
    },
  },
});

export const PinyinText = ({
  pinyin,
  accented,
  small = false,
}: {
  pinyin: string;
  accented?: boolean;
  small?: boolean;
}) => {
  return <Text className={pinyinText({ accented, small })}>{pinyin}</Text>;
};

const pinyinText = tv({
  base: `text-base/none text-primary-9`,
  variants: {
    accented: {
      true: `text-accent-10 opacity-80`,
    },
    small: {
      true: `text-xs/none`,
    },
  },
});
