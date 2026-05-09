import { getSharedPrimaryPronunciation } from "#client/ui/WikiHanziCharacterPronunciation.utils.ts";
import type { DictionarySearchEntry } from "#client/query.ts";
import type { PinyinText } from "#data/model.ts";
import { describe, expect, test } from "vitest";

function createMeaning({
  gloss,
  pinyin,
  freq,
}: {
  gloss: string;
  pinyin?: string;
  freq?: number;
}): Pick<DictionarySearchEntry, `gloss` | `pinyin` | `freq`> {
  return {
    gloss: [gloss],
    pinyin: pinyin == null ? undefined : [pinyin as PinyinText],
    freq,
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

    test(`returns first meaning pronunciation when meanings have different pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({
          gloss: `to walk`,
          pinyin: `xíng`,
        }),
        createMeaning({ gloss: `row`, pinyin: `háng` }),
      ]);

      expect(result).toStrictEqual({
        gloss: `to walk`,
        pinyinUnit: `xíng`,
      });
    });

    test(`returns pronunciation for first item after freq-prioritized ordering`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ gloss: `long`, pinyin: `cháng`, freq: 0.9 }),
        createMeaning({ gloss: `grow`, pinyin: `zhǎng`, freq: 0.6 }),
      ]);

      expect(result).toStrictEqual({
        gloss: `long`,
        pinyinUnit: `cháng`,
      });
    });

    test(`returns first valid meaning when top meaning has no pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ gloss: `first` }),
        createMeaning({ gloss: `child`, pinyin: `zǐ` }),
        createMeaning({ gloss: `suffix`, pinyin: `zi` }),
      ]);

      expect(result).toStrictEqual({
        gloss: `child`,
        pinyinUnit: `zǐ`,
      });
    });

    test(`returns null when no meaning has both gloss and pinyin`, () => {
      const result = getSharedPrimaryPronunciation([
        createMeaning({ gloss: `first` }),
      ]);

      expect(result).toBeNull();
    });
  },
);
