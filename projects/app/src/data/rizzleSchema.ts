import { memoize0 } from "@/util/collections";
import { FsrsState, Rating } from "@/util/fsrs";
import { r, RizzleCustom, RizzleReplicache } from "@/util/rizzle";
import { z } from "zod";
import {
  HanziText,
  MnemonicThemeId,
  PartOfSpeech,
  PinyinInitialGroupId,
  PinyinText,
  SkillType,
  SrsState,
  SrsType,
} from "./model";

export const rSkillType = memoize0(function rSkillType() {
  return r.enum(SkillType, {
    [SkillType.Deprecated_RadicalToEnglish]: `re`,
    [SkillType.Deprecated_EnglishToRadical]: `er`,
    [SkillType.Deprecated_RadicalToPinyin]: `rp`,
    [SkillType.Deprecated_PinyinToRadical]: `pr`,
    [SkillType.Deprecated]: `xx`,
    [SkillType.HanziWordToEnglish]: `he`,
    [SkillType.HanziWordToPinyin]: `hp`,
    [SkillType.HanziWordToPinyinInitial]: `hpi`,
    [SkillType.HanziWordToPinyinFinal]: `hpf`,
    [SkillType.HanziWordToPinyinTone]: `hpt`,
    [SkillType.EnglishToHanziWord]: `eh`,
    [SkillType.PinyinToHanziWord]: `ph`,
    [SkillType.ImageToHanziWord]: `ih`,
    [SkillType.PinyinInitialAssociation]: `pia`,
    [SkillType.PinyinFinalAssociation]: `pfa`,
  });
});

// Skill e.g. `he:好:good`
export type Skill =
  | DeprecatedSkill
  | HanziWordSkill
  | PinyinInitialAssociationSkill
  | PinyinFinalAssociationSkill;

export type DeprecatedSkill =
  | (string & z.BRAND<`DeprecatedSkill`>)
  | `${`xx` | `re` | `er` | `rp` | `pr`}:${string}:${string}`;

export type HanziWordSkill =
  | (string & z.BRAND<`HanziWordSkill`>)
  | `${`he` | `hp` | `hpi` | `hpf` | `hpt` | `eh` | `ph` | `ih`}:${string}:${string}`;

export type PinyinInitialAssociationSkill =
  | (string & z.BRAND<`PinyinInitialAssociationSkill`>)
  | `pia:${string}:${string}`;

export type PinyinFinalAssociationSkill =
  | (string & z.BRAND<`PinyinFinalAssociationSkill`>)
  | `pfa:${string}:${string}`;

export const rPartOfSpeech = memoize0(function rPartOfSpeech() {
  return r.enum(PartOfSpeech, {
    [PartOfSpeech.Noun]: `n`,
    [PartOfSpeech.Verb]: `v`,
    [PartOfSpeech.Adjective]: `adj`,
    [PartOfSpeech.Adverb]: `adv`,
    [PartOfSpeech.Pronoun]: `pron`,
    [PartOfSpeech.Preposition]: `prep`,
    [PartOfSpeech.Conjunction]: `conj`,
    [PartOfSpeech.Interjection]: `int`,
    [PartOfSpeech.MeasureWord]: `mw`,
    [PartOfSpeech.Particle]: `part`,
  });
});

export const rFsrsRating = memoize0(function rFsrsRating() {
  return r.enum(Rating, {
    [Rating.Again]: `1`,
    [Rating.Hard]: `2`,
    [Rating.Good]: `3`,
    [Rating.Easy]: `4`,
  });
});

export const rPinyinInitialGroupId = memoize0(function rPinyinInitialGroupId() {
  return r.enum(PinyinInitialGroupId, {
    [PinyinInitialGroupId.Basic]: `basic`,
    [PinyinInitialGroupId._i]: `-i`,
    [PinyinInitialGroupId._u]: `-u`,
    [PinyinInitialGroupId._v]: `-ü`,
    [PinyinInitialGroupId.Null]: `∅`,
    [PinyinInitialGroupId.Everything]: `everything`,
  });
});

export const rMnemonicThemeId = memoize0(function rMnemonicThemeId() {
  return r.enum(MnemonicThemeId, {
    [MnemonicThemeId.AnimalSpecies]: `AnimalSpecies`,
    [MnemonicThemeId.GreekMythologyCharacter]: `GreekMythologyCharacter`,
    [MnemonicThemeId.MythologyCharacter]: `MythologyCharacter`,
    [MnemonicThemeId.WesternCultureFamousMen]: `WesternCultureFamousMen`,
    [MnemonicThemeId.WesternCultureFamousWomen]: `WesternCultureFamousWomen`,
    [MnemonicThemeId.WesternMythologyCharacter]: `WesternMythologyCharacter`,
  });
});

export const rSkill = memoize0(function rSkill() {
  return RizzleCustom.create<Skill, Skill, Skill>(
    z.custom<Skill>((x) => typeof x === `string`),
    z.custom<Skill>((x) => typeof x === `string`),
  );
});

export const rHanziText = memoize0(function rHanziText() {
  return RizzleCustom.create<HanziText, string, HanziText>(
    z.custom<HanziText>((x) => typeof x === `string`),
    z.custom<HanziText>((x) => typeof x === `string`),
  );
});

export const rPinyinText = memoize0(function rPinyinText() {
  return RizzleCustom.create<PinyinText, string, PinyinText>(
    z.custom<PinyinText>((x) => typeof x === `string`),
    z.custom<PinyinText>((x) => typeof x === `string`),
  );
});

export const rSrsType = memoize0(function rSrsType() {
  return r.enum(SrsType, {
    [SrsType.Mock]: `0`,
    [SrsType.FsrsFourPointFive]: `1`,
  });
});

export const rSrsState = memoize0(function rSrsParams() {
  return (
    // r.discriminatedUnion(`type`, [
    //   r.object({
    //     type: r.literal(SrsType.Null),
    //   }),
    r.object({
      type: r.literal(SrsType.FsrsFourPointFive, rSrsType()).alias(`t`),
      stability: r.number().alias(`s` /* (F)SRS (S)tability */),
      difficulty: r.number().alias(`d` /* (F)SRS (D)ifficulty */),
      prevReviewAt: r.datetime().alias(`p`),
      nextReviewAt: r.datetime().alias(`n`).indexed(`byNextReviewAt`),
    })
    // ]),
  );
});

/**
 * # v7 change log
 *
 * - **Breaking**: `skillState` `createdAt` and `due` values are now part of
 *   `srs` instead of being separate fields. It's also now non-nullable.
 * - **Breaking**: `initSkillState` mutator is removed.
 *
 * # v6 change log
 *
 * - **Breaking**: entity values no longer exclude the key-path fields, so you
 *   don't need to juggle pulling values sometimes from the key and sometimes
 *   from the value.
 * - **Breaking**: `skillRating` now uses an nanoid in the key rather than
 *   having the `skill` and `createdAt` as a composite-key.
 *
 * # v5 change log
 *
 * - **Breaking**: `rSkill` changes how "hanzi word" skills are encoded. It now
 *   includes the meaning-key when referencing a hanzi. This means all skill
 *   ratings, states, and related mutators are broken.
 *
 * # v4 change log
 *
 * - `skillState` has properties changed from `timestamp()` to `datetime()` so
 *   that they're indexable.
 */
export const v7 = {
  version: `v7`,

  //
  // Skills
  //
  skillRating: r.entity(`sr/[id]`, {
    id: r.string().alias(`i`),
    skill: rSkill().alias(`s`).indexed(`bySkill`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    rating: rFsrsRating().alias(`r`),
    durationMs: r.number().nullable().optional().alias(`d`),
  }),
  skillState: r.entity(`s/[skill]`, {
    skill: rSkill().alias(`s`),
    srs: rSrsState().alias(`r`),
  }),

  //
  // Mistakes
  //
  hanziGlossMistake: r.entity(`m/hg/[id]`, {
    id: r.string().alias(`i`),
    hanzi: r.string().alias(`h`),
    gloss: r.string().alias(`g`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
  }),
  hanziPinyinMistake: r.entity(`m/hp/[id]`, {
    id: r.string().alias(`i`),
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
  }),

  //
  // Pinyin mnemonics
  //
  pinyinFinalAssociation: r.entity(`pf/[final]`, {
    final: r.string().alias(`f`),
    name: r.string().alias(`n`),
  }),
  pinyinInitialAssociation: r.entity(`pi/[initial]`, {
    initial: r.string().alias(`i`),
    name: r.string().alias(`n`),
  }),
  pinyinInitialGroupTheme: r.entity(`pigt/[groupId]`, {
    groupId: rPinyinInitialGroupId().alias(`g`),
    themeId: rMnemonicThemeId().alias(`t`),
  }),

  // Mutators
  setPinyinInitialAssociation: r.mutator({
    /**
     * The initial component as defined by the pinyin chart. No trailing dash.
     * e.g. `yu`, `ch`, `p`
     */
    initial: r.string().alias(`i`),
    name: r.string().alias(`n`),
    now: r.timestamp().alias(`t`),
  }),
  setPinyinFinalAssociation: r.mutator({
    /**
     * The initial component as defined by the pinyin chart. No leading dash.
     * e.g. `ia`, `ê`, `∅`
     */
    final: r.string().alias(`f`),
    name: r.string().alias(`n`),
    now: r.timestamp().alias(`t`),
  }),
  setPinyinInitialGroupTheme: r.mutator({
    groupId: rPinyinInitialGroupId().alias(`g`),
    themeId: rMnemonicThemeId().alias(`t`),
    now: r.timestamp().alias(`n`),
  }),
  rateSkill: r
    .mutator({
      id: r.string().alias(`i`),
      skill: rSkill().alias(`s`),
      rating: rFsrsRating().alias(`r`),
      durationMs: r.number().nullable().alias(`d`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`reviewSkill`),
  saveHanziGlossMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanzi: rHanziText().alias(`h`),
      gloss: r.string().alias(`g`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`shgm`),
  saveHanziPinyinMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanzi: rHanziText().alias(`h`),
      pinyin: rPinyinText().alias(`p`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`shpm`),
};

export function srsStateFromFsrsState(fsrsState: FsrsState) {
  return {
    type: SrsType.FsrsFourPointFive,
    stability: fsrsState.stability,
    difficulty: fsrsState.difficulty,
    nextReviewAt: fsrsState.nextReviewAt,
    prevReviewAt: fsrsState.prevReviewAt,
  } satisfies SrsState;
}

// This is a placeholder to keep code around that demonstrates how to support
// multiple schema versions at the same time.
export const v7_1 = {
  ...v7,
  version: `7.1`,
};

export const supportedSchemas = [v7, v7_1] as const;

export type SupportedSchema = (typeof supportedSchemas)[number];

export type Rizzle = RizzleReplicache<typeof v7>;

export type SkillState = NonNullable<
  Awaited<ReturnType<typeof v7.skillState.get>>
>;
