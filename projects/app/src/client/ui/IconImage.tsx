import { invariant } from "@pinyinly/lib/invariant";
import type { ImageProps } from "expo-image";
import { Image } from "expo-image";
import { tv } from "tailwind-variants";

export interface IconImageProps extends Pick<ImageProps, `className`> {
  icon: IconName;
  size?: 12 | 16 | 24 | 32;
}

export function IconImage({ icon, className, size }: IconImageProps) {
  if (__DEV__ && className != null) {
    classNameLintInvariant(className);
  }

  return (
    <Image
      className={imageClass({ className, size })}
      source={iconRegistry[icon]}
      tintColor={
        // Use the current text color as the tint.
        `currentColor`
      }
    />
  );
}

const imageClass = tv({
  // It's a UI element and not part of the content, so:
  // - `pointer-events-none` to prevent the image from being click and dragged
  // - `select-none` to not highlight with a box when it's surrounded in a text
  //   selection.
  base: `pointer-events-none shrink select-none text-fg`,
  variants: {
    size: {
      12: `size-[12px]`,
      16: `size-[16px]`,
      24: `size-[24px]`,
      32: `size-[32px]`,
    },
  },
  defaultVariants: {
    size: 24,
  },
});

export function classNameLintInvariant(className: string) {
  invariant(
    !/\btext-\w+\/\d+\b/.test(className),
    `transparent text colors are not supported properly by expo-image, use -bgXX colors instead`,
  );
  invariant(
    !/\bsize-/.test(className),
    `use the \`size\` prop instead of passing a size- class`,
  );
}

// prettier-ignore
// oxlint-disable eslint-plugin-import/no-commonjs
const iconRegistry = {
  // <pyly-glob-template glob="../../assets/icons/*.svg" template="  [`${filenameWithoutExt}`]: require(`${path}`),">
  [`alarm-filled`]: require(`../../assets/icons/alarm-filled.svg`),
  [`alarm`]: require(`../../assets/icons/alarm.svg`),
  [`arrow-down`]: require(`../../assets/icons/arrow-down.svg`),
  [`arrow-left`]: require(`../../assets/icons/arrow-left.svg`),
  [`arrow-return-left`]: require(`../../assets/icons/arrow-return-left.svg`),
  [`arrow-right-down`]: require(`../../assets/icons/arrow-right-down.svg`),
  [`arrow-right`]: require(`../../assets/icons/arrow-right.svg`),
  [`arrow-up`]: require(`../../assets/icons/arrow-up.svg`),
  [`badge-filled`]: require(`../../assets/icons/badge-filled.svg`),
  [`badge`]: require(`../../assets/icons/badge.svg`),
  [`book`]: require(`../../assets/icons/book.svg`),
  [`bookmark-filled`]: require(`../../assets/icons/bookmark-filled.svg`),
  [`bookmark`]: require(`../../assets/icons/bookmark.svg`),
  [`bulb`]: require(`../../assets/icons/bulb.svg`),
  [`cart`]: require(`../../assets/icons/cart.svg`),
  [`check-circled-filled`]: require(`../../assets/icons/check-circled-filled.svg`),
  [`check`]: require(`../../assets/icons/check.svg`),
  [`chevron-down`]: require(`../../assets/icons/chevron-down.svg`),
  [`chevron-left`]: require(`../../assets/icons/chevron-left.svg`),
  [`chevron-right`]: require(`../../assets/icons/chevron-right.svg`),
  [`chevron-up`]: require(`../../assets/icons/chevron-up.svg`),
  [`circle-warning`]: require(`../../assets/icons/circle-warning.svg`),
  [`close-circled-filled`]: require(`../../assets/icons/close-circled-filled.svg`),
  [`close`]: require(`../../assets/icons/close.svg`),
  [`document`]: require(`../../assets/icons/document.svg`),
  [`dumbbell`]: require(`../../assets/icons/dumbbell.svg`),
  [`flag-1`]: require(`../../assets/icons/flag-1.svg`),
  [`flag`]: require(`../../assets/icons/flag.svg`),
  [`flame-filled`]: require(`../../assets/icons/flame-filled.svg`),
  [`flame`]: require(`../../assets/icons/flame.svg`),
  [`flash`]: require(`../../assets/icons/flash.svg`),
  [`frown-circled`]: require(`../../assets/icons/frown-circled.svg`),
  [`help-circled`]: require(`../../assets/icons/help-circled.svg`),
  [`home-filled`]: require(`../../assets/icons/home-filled.svg`),
  [`home`]: require(`../../assets/icons/home.svg`),
  [`inbox-filled`]: require(`../../assets/icons/inbox-filled.svg`),
  [`keyboard`]: require(`../../assets/icons/keyboard.svg`),
  [`loader`]: require(`../../assets/icons/loader.svg`),
  [`lock-filled`]: require(`../../assets/icons/lock-filled.svg`),
  [`medal`]: require(`../../assets/icons/medal.svg`),
  [`meh-circled`]: require(`../../assets/icons/meh-circled.svg`),
  [`menu`]: require(`../../assets/icons/menu.svg`),
  [`message-bubble-filled`]: require(`../../assets/icons/message-bubble-filled.svg`),
  [`message-text`]: require(`../../assets/icons/message-text.svg`),
  [`note-2`]: require(`../../assets/icons/note-2.svg`),
  [`plant-filled`]: require(`../../assets/icons/plant-filled.svg`),
  [`profile-filled`]: require(`../../assets/icons/profile-filled.svg`),
  [`profile`]: require(`../../assets/icons/profile.svg`),
  [`puzzle`]: require(`../../assets/icons/puzzle.svg`),
  [`redo`]: require(`../../assets/icons/redo.svg`),
  [`repeat`]: require(`../../assets/icons/repeat.svg`),
  [`ruler`]: require(`../../assets/icons/ruler.svg`),
  [`search`]: require(`../../assets/icons/search.svg`),
  [`settings-filled`]: require(`../../assets/icons/settings-filled.svg`),
  [`settings`]: require(`../../assets/icons/settings.svg`),
  [`show`]: require(`../../assets/icons/show.svg`),
  [`shuffle`]: require(`../../assets/icons/shuffle.svg`),
  [`smile-circled`]: require(`../../assets/icons/smile-circled.svg`),
  [`speaker-2`]: require(`../../assets/icons/speaker-2.svg`),
  [`star-filled`]: require(`../../assets/icons/star-filled.svg`),
  [`star`]: require(`../../assets/icons/star.svg`),
  [`time-circled`]: require(`../../assets/icons/time-circled.svg`),
  [`tone`]: require(`../../assets/icons/tone.svg`),
  [`translate`]: require(`../../assets/icons/translate.svg`),
  [`trending-down`]: require(`../../assets/icons/trending-down.svg`),
  [`trending-up`]: require(`../../assets/icons/trending-up.svg`),
  [`undo`]: require(`../../assets/icons/undo.svg`),
  [`voice-square`]: require(`../../assets/icons/voice-square.svg`),
  [`zap-filled`]: require(`../../assets/icons/zap-filled.svg`),
// </pyly-glob-template>
// oxlint-enable eslint-plugin-import/no-commonjs
};

export type IconName = keyof typeof iconRegistry;
export const iconNames = Object.keys(iconRegistry) as readonly IconName[];
