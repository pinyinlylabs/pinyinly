import { getSharedPrimaryPronunciation } from "#client/ui/WikiHanziCharacterIntro.utils.ts";
import type { PinyinText } from "#data/model.ts";
import type { HanziWordWithMeaning } from "#dictionary.ts";
import { describe, expect, test } from "vitest";

function createMeaning({
  meaningKey,
  gloss,
  pinyin,
}: {
  meaningKey: string;
  gloss: string;
  pinyin?: string;
}): HanziWordWithMeaning {
  return [
    `好:${meaningKey}`,
    {
      gloss: [gloss],
      pinyin: pinyin == null ? null : [pinyin as PinyinText],
      hsk: undefined,
    },
  ] as HanziWordWithMeaning;
}

describe(
  `getSharedPrimaryPronunciation suite` satisfies HasNameOf<
    typeof getSharedPrimaryPronunciation
  >,
  () => {
    test(`returns pronunciation for a single meaning`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ meaningKey: `positive`, gloss: `good`, pinyin: `hǎo` }),
      ]);

      expect(result).toStrictEqual({
        gloss: `good`,
        pinyinUnit: `hǎo`,
      });
    });

    test(`returns pronunciation when all meanings share pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ meaningKey: `positive`, gloss: `good`, pinyin: `hǎo` }),
        createMeaning({ meaningKey: `like`, gloss: `to like`, pinyin: `hǎo` }),
      ]);

      expect(result).toStrictEqual({
        gloss: `good`,
        pinyinUnit: `hǎo`,
      });
    });

    test(`returns null when meanings have different pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({
          meaningKey: `walk`,
          gloss: `to walk`,
          pinyin: `xíng`,
        }),
        createMeaning({ meaningKey: `row`, gloss: `row`, pinyin: `háng` }),
      ]);

      expect(result).toBeNull();
    });

    test(`returns null when no meaning has both gloss and pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ meaningKey: `first`, gloss: `first` }),
      ]);

      expect(result).toBeNull();
    });
  },
);
