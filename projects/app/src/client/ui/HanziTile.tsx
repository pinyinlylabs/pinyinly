import type { HanziText, PinyinText } from "@/data/model";
import { characterCount } from "@/util/unicode";
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
  pinyin?: PinyinText;
  className?: string;
  variant?: `outline` | `filled`;
  size?: `10` | `20` | `47`;
  linked?: boolean;
  progress?: number;
}) {
  const [showWiki, setShowWiki] = useState(false);

  return (
    <Pressable
      onPress={() => {
        setShowWiki(true);
      }}
      disabled={!linked}
    >
      <View
        className={tileClass({
          variant,
          size,
          class: className,
          isCharacter: hanzi.length === 1,
        })}
      >
        {pinyin == null ? null : (
          <Text
            className={pinyinTextClass({ size })}
            style={{ "--char-count": `${characterCount(pinyin)}` }}
          >
            {pinyin}
          </Text>
        )}
        <Text
          className={hanziTextClass({ size })}
          style={{ "--char-count": `${characterCount(hanzi)}` }}
        >
          {hanzi}
        </Text>
        {gloss == null ? null : (
          <Text
            className={glossTextClass({ size })}
            style={{ "--char-count": `${characterCount(gloss)}` }}
          >
            {gloss}
          </Text>
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
      filled: `theme-sky-panel items-center justify-center`,
    },
    isCharacter: {
      true: ``,
    },
    size: {
      "10": `h-[40px] rounded-md p-2`,
      "20": `w-[80px] rounded-lg py-2`,
      "47": `min-h-[188px] w-[188px] rounded-lg py-3`,
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
  base: `pointer-events-none absolute inset-0 z-10`,
  variants: {
    variant: {
      outline: ``,
      filled: `rounded-lg outline outline-1 -outline-offset-1 outline-fg-loud/10`,
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
    bg-[linear-gradient(to_right,_#FBBF24,_#FBBF24_var(--progress),_rgb(from_var(--color-fg-loud)_r_g_b_/_10%)_calc(var(--progress)+0.01%))]
  `,
  variants: {
    variant: {
      outline: `hidden`,
      filled: `absolute inset-x-0 bottom-0 bg-fg-loud/10`,
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
  base: `content-center overflow-hidden text-center font-sans text-fg-loud/80`,
  variants: {
    size: {
      "10": `hidden`,
      // Interpolate between 10px-14px based on character count. 80px is the
      // tile width, 2px is border, 16px is the padding, 2 is glyph scale factor.
      "20": `
        h-[24px] px-2 text-[clamp(10px,(80px-2px-16px)/var(--char-count)*2,14px)] font-light
        leading-none
      `,
      // Interpolate between 10px-18px based on character count. 80px is the
      // tile width, 2px is border, 16px is the padding, 2 is glyph scale factor.
      "47": `
        h-[24px] px-2 text-[clamp(10px,(188px-2px-16px)/var(--char-count)*2,18px)] font-medium
        leading-tight
      `,
    },
  },
});

const hanziTextClass = tv({
  base: `max-w-full content-center text-center font-sans font-medium text-fg-loud`,
  variants: {
    size: {
      "10": `text-[24px]/normal`,
      // Interpolate between 10px-38px based on character count. 80px is the
      // tile width, 2px is border, 8px is the padding.
      "20": `h-12 px-1 text-[clamp(10px,(80px-2px-8px)/var(--char-count),38px)] leading-none`,
      // Interpolate between 10px-38px based on character count. 80px is the
      // tile width, 2px is border, 16px is the padding.
      "47": `
        h-[110px] px-2 text-[clamp(10px,(188px-2px-16px)/var(--char-count),100px)] leading-[110px]
      `,
    },
  },
});

const glossTextClass = tv({
  base: `max-w-full content-center text-center font-sans text-fg-loud/90`,
  variants: {
    size: {
      "10": `hidden`,
      // Interpolate between 12px-14px based on character count. 80px is the
      // tile width, 2px is border, 8px is the padding, 3 is the number of lines.
      "20": `
        h-8 px-2 text-[clamp(10px,(80px-2px-16px)*3/var(--char-count),14px)] font-semibold
        leading-none
      `,
      // Interpolate between 12px-24px based on character count. 188px is the
      // tile width, 24px is the padding, 3 is the number of lines.
      "47": `
        h-14 px-6 text-[clamp(12px,(188px-2px-24px)*3/var(--char-count),24px)] font-bold
        leading-tight
      `,
    },
  },
});
