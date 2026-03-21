import { pickSoundUsageExamplesForEntries } from "#client/ui/soundUsageExamples.ts";
import type { DictionarySearchEntry } from "#client/query.ts";
import type {
  HanziText,
  HanziWord,
  PinyinSoundId,
  PinyinText,
} from "#data/model.js";
import { describe, expect, test } from "vitest";

describe(
  `pickSoundUsageExamplesForEntries suite` satisfies HasNameOf<
    typeof pickSoundUsageExamplesForEntries
  >,
  () => {
    test(`matches initial sounds with dedupe and limit`, () => {
      const entries = [
        makeEntry(`包:wrap`, { gloss: [`wrap`], pinyin: [pinyin`bāo`] }),
        makeEntry(`包:bag`, { gloss: [`bag`], pinyin: [pinyin`bāo`] }),
        makeEntry(`爸爸:dad`, { gloss: [`dad`], pinyin: [pinyin`bà ba`] }),
        makeEntry(`把:hold`, { gloss: [`hold`], pinyin: [pinyin`bǎ`] }),
        makeEntry(`北:north`, { gloss: [`north`], pinyin: [pinyin`běi`] }),
        makeEntry(`帮:help`, { gloss: [`help`], pinyin: [pinyin`bāng`] }),
        makeEntry(`班:class`, { gloss: [`class`], pinyin: [pinyin`bān`] }),
        makeEntry(`冰:ice`, { gloss: [`ice`], pinyin: [pinyin`bīng`] }),
      ];

      const result = pickSoundUsageExamplesForEntries({
        allEntries: entries,
        limit: 5,
        soundId: `b-` as PinyinSoundId,
      });

      expect(result.map((x) => x.hanzi)).toEqual([
        `包`,
        `把`,
        `北`,
        `帮`,
        `班`,
      ]);
    });

    test(`matches final sounds`, () => {
      const entries = [
        makeEntry(`包:wrap`, { gloss: [`wrap`], pinyin: [pinyin`bāo`] }),
        makeEntry(`刀:knife`, { gloss: [`knife`], pinyin: [pinyin`dāo`] }),
        makeEntry(`高:tall`, { gloss: [`tall`], pinyin: [pinyin`gāo`] }),
        makeEntry(`早:early`, { gloss: [`early`], pinyin: [pinyin`zǎo`] }),
        makeEntry(`狗:dog`, { gloss: [`dog`], pinyin: [pinyin`gǒu`] }),
      ];

      const result = pickSoundUsageExamplesForEntries({
        allEntries: entries,
        limit: 5,
        soundId: `-ao` as PinyinSoundId,
      });

      expect(result.map((x) => x.hanziWord)).toEqual([
        `包:wrap`,
        `刀:knife`,
        `高:tall`,
        `早:early`,
      ]);
    });

    test(`returns empty for tone sound ids`, () => {
      const result = pickSoundUsageExamplesForEntries({
        allEntries: [
          makeEntry(`包:wrap`, { gloss: [`wrap`], pinyin: [pinyin`bāo`] }),
        ],
        limit: 5,
        soundId: `3` as PinyinSoundId,
      });

      expect(result).toEqual([]);
    });

    test(`skips entries without a single pinyin unit`, () => {
      const result = pickSoundUsageExamplesForEntries({
        allEntries: [
          makeEntry(`地:ground`, {
            gloss: [`ground`],
            pinyin: [pinyin`de dì`],
          }),
          makeEntry(`的:possessive`, {
            gloss: [`possessive`],
            pinyin: [pinyin`de`],
          }),
        ],
        limit: 5,
        soundId: `d-` as PinyinSoundId,
      });

      expect(result.map((x) => x.hanziWord)).toEqual([`的:possessive`]);
    });
  },
);

function makeEntry(
  hanziWord: HanziWord,
  meaning: Pick<DictionarySearchEntry, `gloss` | `pinyin`>,
): Pick<DictionarySearchEntry, `hanziWord` | `hanzi` | `gloss` | `pinyin`> {
  const hanzi = hanziWord.split(`:`)[0] as HanziText;
  return { hanziWord, hanzi, ...meaning };
}

function pinyin(
  strings: TemplateStringsArray,
  ...values: unknown[]
): PinyinText {
  const text = String.raw({ raw: strings }, ...values);
  return text as PinyinText;
}
