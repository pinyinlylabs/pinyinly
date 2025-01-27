import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export const HanziText = ({
  pinyin,
  hanzi,
  accented,
  hanziClassName,
}: {
  pinyin?: string;
  hanzi: string;
  accented?: boolean;
  hanziClassName?: string;
}) => {
  return (
    <View className="flex-0 items-center">
      <Text className={hanziText({ accented, className: hanziClassName })}>
        {hanzi}
      </Text>
      {pinyin != null ? (
        <>
          <Text
            className={pinyinText({
              accented,
              className: `absolute bottom-[100%] left-0 right-0 text-center`,
            })}
          >
            {pinyin}
          </Text>
          <Text
            className={pinyinText({
              accented,
              // Hide the pinyin text, but keep it in the layout to give enough
              // space for absolute positioned floating one.
              className: `h-[0] opacity-0`,
            })}
          >
            {pinyin}
          </Text>
        </>
      ) : null}
    </View>
  );
};

const pinyinText = tv({
  base: `text-xs text-primary-9 text-nowrap`,
  variants: {
    accented: {
      true: `text-accent-10 opacity-80`,
    },
  },
});

const hanziText = tv({
  base: `text-xl text-text`,
  variants: {
    accented: {
      true: `text-accent-10`,
    },
  },
});
