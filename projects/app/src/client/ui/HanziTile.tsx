import type { HanziText } from "@/data/model";
import type { PropsOf } from "@pinyinly/lib/types";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { WikiHanziModal } from "./WikiHanziModal";

export type HanziTileProps = PropsOf<typeof HanziTile>;

export function HanziTile({
  hanzi,
  gloss,
  pinyin,
  className = ``,
  variant = `filled`,
  size = `20`,
  linked = false,
  progress,
}: {
  hanzi: HanziText;
  gloss?: string;
  pinyin?: string;
  className?: string;
  variant?: `outline` | `filled`;
  size?: `10` | `20` | `47`;
  linked?: boolean;
  progress?: number;
}) {
  const [showWiki, setShowWiki] = useState(false);
  const handlePress = linked
    ? () => {
        setShowWiki(true);
      }
    : undefined;

  return (
    <Pressable onPress={handlePress}>
      <View
        className={tileClass({
          variant,
          size,
          class: className,
          isCharacter: hanzi.length === 1,
        })}
      >
        {pinyin == null ? null : (
          <Text className={pinyinTextClass({ size })}>{pinyin}</Text>
        )}
        <Text className={hanziTextClass({ size })}>{hanzi}</Text>
        {gloss == null ? null : (
          <Text className={glossTextClass({ size })}>{gloss}</Text>
        )}
        {progress == null ? null : (
          <View
            className={progressBarClass({ variant, size })}
            style={{ "--progress": `${progress * 100}%` }}
          >
            <View className={progressBarMaskClass({ size })} />
          </View>
        )}
        <View className={outlineClass({ variant, size })} />
      </View>
      {showWiki ? (
        <WikiHanziModal
          hanzi={hanzi}
          onDismiss={() => {
            setShowWiki(false);
          }}
        />
      ) : null}
    </Pressable>
  );
}

const tileClass = tv({
  base: `overflow-hidden bg-bg`,
  variants: {
    variant: {
      outline: `items-center justify-center border border-b-2 border-fg-loud`,
      filled: `theme-sky items-center justify-center`,
    },
    isCharacter: {
      true: ``,
    },
    size: {
      "10": `h-[40px] rounded-md px-3`,
      "20": `min-w-[80px] rounded-lg px-4 py-2`,
      "47": `min-h-[188px] min-w-[188px] rounded-lg px-6 py-3`,
    },
  },
  compoundVariants: [
    {
      size: `10`,
      isCharacter: true,
      class: `aspect-square`,
    },
  ],
});

const outlineClass = tv({
  base: `absolute inset-0 z-10 select-none`,
  variants: {
    variant: {
      outline: ``,
      filled: `rounded-lg outline outline-1 -outline-offset-1 outline-bg-inverted/10`,
    },
    size: {
      "10": `rounded-md`,
      "20": `rounded-lg`,
      "47": `rounded-lg`,
    },
  },
});

const progressBarClass = tv({
  base: `
    bg-[linear-gradient(to_right,_#FBBF24,_#FBBF24_var(--progress),_rgb(from_var(--color-bg-inverted)_r_g_b_/_10%)_calc(var(--progress)+0.01%))]
  `,
  variants: {
    variant: {
      outline: `hidden`,
      filled: `absolute inset-x-0 bottom-0 bg-bg-inverted/10`,
    },
    size: {
      "10": `h-[7px]`,
      "20": `h-[8px]`,
      "47": `h-[12px]`,
    },
  },
});

const progressBarMaskClass = tv({
  base: `absolute inset-x-0 bg-bg`,
  variants: {
    size: {
      "10": `bottom-[3px] h-[5px] rounded-b-md`,
      "20": `bottom-[4px] h-[6px] rounded-b-md`,
      "47": `bottom-[6px] h-[8px] rounded-b-lg`,
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
      "10": `text-[24px]/normal`,
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
