import { getSharedPrimaryPronunciation } from "#client/ui/WikiHanziCharacterIntro.utils.ts";
import type { DictionarySearchEntry } from "#client/query.ts";
import type { PinyinText } from "#data/model.ts";
import { describe, expect, test } from "vitest";

function createMeaning({
  gloss,
  pinyin,
}: {
  gloss: string;
  pinyin?: string;
}): Pick<DictionarySearchEntry, `gloss` | `pinyin`> {
  return {
    gloss: [gloss],
    pinyin: pinyin == null ? undefined : [pinyin as PinyinText],
  };
}

describe(
  `getSharedPrimaryPronunciation suite` satisfies HasNameOf<
    typeof getSharedPrimaryPronunciation
  >,
  () => {
    test(`returns pronunciation for a single meaning`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ gloss: `good`, pinyin: `hǎo` }),
      ]);

      expect(result).toStrictEqual({
        gloss: `good`,
        pinyinUnit: `hǎo`,
      });
    });

    test(`returns pronunciation when all meanings share pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ gloss: `good`, pinyin: `hǎo` }),
        createMeaning({ gloss: `to like`, pinyin: `hǎo` }),
      ]);

      expect(result).toStrictEqual({
        gloss: `good`,
        pinyinUnit: `hǎo`,
      });
    });

    test(`returns null when meanings have different pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({
          gloss: `to walk`,
          pinyin: `xíng`,
        }),
        createMeaning({ gloss: `row`, pinyin: `háng` }),
      ]);

      expect(result).toBeNull();
    });

    test(`returns null when no meaning has both gloss and pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ gloss: `first` }),
      ]);

      expect(result).toBeNull();
    });
  },
);
