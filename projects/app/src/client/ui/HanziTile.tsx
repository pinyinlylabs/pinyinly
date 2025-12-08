import type { HanziText } from "@/data/model";
import type { PropsOf } from "@pinyinly/lib/types";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export type HanziTileProps = PropsOf<typeof HanziTile>;

export function HanziTile({
  hanzi,
  gloss,
  pinyin,
  className = ``,
  variant = `filled`,
  size = `normal`,
}: {
  hanzi: HanziText;
  gloss?: string;
  pinyin?: string;
  className?: string;
  variant?: `outline` | `filled`;
  size?: `normal` | `xl`;
}) {
  return (
    <View className={tileClass({ variant, size, class: className })}>
      {pinyin == null ? null : (
        <Text className={pinyinTextClass({ size })}>{pinyin}</Text>
      )}
      <Text className={hanziTextClass({ size })}>{hanzi}</Text>
      {gloss == null ? null : (
        <Text className={glossTextClass({ size })}>{gloss}</Text>
      )}
    </View>
  );
}

const tileClass = tv({
  base: `rounded-lg`,
  variants: {
    variant: {
      outline: `items-center justify-center border border-b-2 border-fg-loud`,
      filled: `theme-sky items-center justify-center bg-bg`,
    },
    size: {
      normal: `min-w-[80px] px-4 py-3`,
      xl: `min-h-[150px] min-w-[150px] px-4 py-3`,
    },
  },
});

const pinyinTextClass = tv({
  base: `text-center font-sans text-fg-loud`,
  variants: {
    size: {
      normal: `text-sm`,
      xl: `text-lg/5`,
    },
  },
});

const hanziTextClass = tv({
  base: `text-center font-sans font-medium text-fg-loud`,
  variants: {
    size: {
      normal: `text-[38px]/[46px]`,
      xl: `text-[100px]/[110px]`,
    },
  },
});

const glossTextClass = tv({
  base: `text-center font-sans text-fg-loud`,
  variants: {
    size: {
      normal: `text-base font-semibold`,
      xl: `text-2xl/6 font-bold`,
    },
  },
});
