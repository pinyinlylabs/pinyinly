import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export const HanziText = ({
  pinyin,
  hanzi,
  accented,
  small = false,
}: {
  pinyin?: string;
  hanzi: string;
  accented?: boolean;
  small?: boolean;
}) => {
  const pinyinWithoutSpaces = pinyin?.split(` `).join(``);
  return (
    <View
      className={`flex-0 flex-col items-center ${small ? `gap-0.5` : `gap-1`}`}
    >
      {pinyinWithoutSpaces == null ? null : (
        <Text className={pinyinText({ accented, small })}>
          {pinyinWithoutSpaces}
        </Text>
      )}
      <Text className={hanziText({ accented, small })}>{hanzi}</Text>
    </View>
  );
};

const pinyinText = tv({
  base: `text-base/none text-primary-9 w-full text-center`,
  variants: {
    accented: {
      true: `text-accent-10 opacity-80`,
    },
    small: {
      true: `text-xs/none`,
    },
  },
});

const hanziText = tv({
  base: `text-2xl/none text-text`,

  variants: {
    accented: {
      true: `text-accent-10`,
    },
    small: {
      true: `text-xl/none`,
    },
  },
});
