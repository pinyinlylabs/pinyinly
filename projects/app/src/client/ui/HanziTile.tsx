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
  size = `20`,
}: {
  hanzi: HanziText;
  gloss?: string;
  pinyin?: string;
  className?: string;
  variant?: `outline` | `filled`;
  size?: `10` | `20` | `47`;
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
  base: `bg-bg`,
  variants: {
    variant: {
      outline: `items-center justify-center border border-b-2 border-fg-loud`,
      filled: `
        theme-sky items-center justify-center outline outline-1 -outline-offset-1
        outline-bg-inverted/10
      `,
    },
    size: {
      "10": `h-[40px] min-w-[40px] rounded-md px-3`,
      "20": `min-w-[80px] rounded-lg px-4 py-2`,
      "47": `min-h-[188px] min-w-[188px] rounded-lg px-6 py-3`,
    },
  },
});

const pinyinTextClass = tv({
  base: `text-center font-sans font-medium text-fg-loud`,
  variants: {
    size: {
      "10": `hidden`,
      "20": `mb-1 text-base`,
      "47": `mb-1 text-lg/5`,
    },
  },
});

const hanziTextClass = tv({
  base: `text-center font-sans font-medium text-fg-loud`,
  variants: {
    size: {
      "10": `text-[16px]/[16px]`,
      "20": `text-[38px]/[46px]`,
      "47": `text-[100px]/[110px]`,
    },
  },
});

const glossTextClass = tv({
  base: `text-center font-sans text-fg-loud`,
  variants: {
    size: {
      "10": `hidden`,
      "20": `text-base font-semibold`,
      "47": `mb-1 text-2xl/7 font-bold`,
    },
  },
});
