import { memoize0 } from "@/util/collections";
import type { FsrsState } from "@/util/fsrs";
import { Rating } from "@/util/fsrs";
import type { RizzleReplicache } from "@/util/rizzle";
import { r, RizzleCustom } from "@/util/rizzle";
import omit from "lodash/omit.js";
import { z } from "zod/v4";
import type {
  HanziText,
  HanziWord,
  PinyinPronunciation,
  PinyinPronunciationSpaceSeparated,
  PinyinSoundGroupId,
  PinyinSoundId,
  PinyinSyllable,
  SrsStateType,
} from "./model";
import { PartOfSpeech, SkillKind, SrsKind } from "./model";

export const rSkillKind = memoize0(function rSkillKind() {
  return r.enum(SkillKind, {
    [SkillKind.Deprecated_RadicalToEnglish]: `re`,
    [SkillKind.Deprecated_EnglishToRadical]: `er`,
    [SkillKind.Deprecated_RadicalToPinyin]: `rp`,
    [SkillKind.Deprecated_PinyinToRadical]: `pr`,
    [SkillKind.Deprecated]: `xx`,
    [SkillKind.HanziWordToGloss]: `he`,
    [SkillKind.HanziWordToPinyin]: `hp`,
    [SkillKind.HanziWordToPinyinInitial]: `hpi`,
    [SkillKind.HanziWordToPinyinFinal]: `hpf`,
    [SkillKind.HanziWordToPinyinTone]: `hpt`,
    [SkillKind.GlossToHanziWord]: `eh`,
    [SkillKind.PinyinToHanziWord]: `ph`,
    [SkillKind.ImageToHanziWord]: `ih`,
    [SkillKind.PinyinInitialAssociation]: `pia`,
    [SkillKind.PinyinFinalAssociation]: `pfa`,
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

export const rHanziWord = memoize0(function rHanziWord() {
  return RizzleCustom.create<HanziWord, HanziWord, HanziWord>(
    z.custom<HanziWord>((x) => typeof x === `string`),
    z.custom<HanziWord>((x) => typeof x === `string`),
  );
});

export const rSkill = memoize0(function rSkill() {
  return RizzleCustom.create<Skill, Skill, Skill>(
    z.custom<Skill>((x) => typeof x === `string`),
    z.custom<Skill>((x) => typeof x === `string`),
  );
});

const _brandedStringImpl = r.string();
const brandedString = <T extends string>() =>
  _brandedStringImpl as RizzleCustom<T, T, T>;

export const rHanziOrHanziWord = brandedString<HanziText | HanziWord>;
export const rPinyinSoundId = brandedString<PinyinSoundId>;
export const rPinyinSoundGroupId = brandedString<PinyinSoundGroupId>;

export const pinyinSyllableSchema = z.custom<PinyinSyllable>(
  (x) => typeof x === `string`,
);

export const rSpaceSeparatedString = memoize0(function rSpaceSeparatedString() {
  return RizzleCustom.create<readonly string[], string, readonly string[]>(
    z.array(z.string()).transform((x) => x.join(` `)),
    z.string().transform((x) => x.split(/ +/) as readonly string[]),
  );
});

export const rPinyinPronunciation = memoize0(function rPinyinPronunciation() {
  return RizzleCustom.create<
    Readonly<PinyinPronunciation>,
    PinyinPronunciationSpaceSeparated,
    PinyinPronunciation
  >(
    z
      .array(pinyinSyllableSchema)
      .transform((x) => x.join(` `) as PinyinPronunciationSpaceSeparated),
    z
      .custom<PinyinPronunciationSpaceSeparated>((x) => typeof x === `string`)
      .transform((x) => x.split(/\s+/) as PinyinSyllable[]),
  );
});

export const rSrsKind = memoize0(function rSrsKind() {
  return r.enum(SrsKind, {
    [SrsKind.Mock]: `0`,
    [SrsKind.FsrsFourPointFive]: `1`,
  });
});

export const rSrsState = memoize0(function rSrsParams() {
  return (
    // r.discriminatedUnion(`type`, [
    //   r.object({
    //     type: r.literal(SrsType.Null),
    //   }),
    r.object({
      kind: r.literal(SrsKind.FsrsFourPointFive, rSrsKind()).alias(`t`),
      stability: r.number().alias(`s` /* (F)SRS (S)tability */),
      difficulty: r.number().alias(`d` /* (F)SRS (D)ifficulty */),
      prevReviewAt: r.datetime().alias(`p`),
      nextReviewAt: r.datetime().alias(`n`).indexed(`byNextReviewAt`),
    })
    // ]),
  );
});

/**
 * # v9 change log
 *
 * - **Breaking**: removed pinyin initial/final associations and groups,
 *   replaced with a single unified model.
 *
 * # v8 change log
 *
 * - **Breaking**: the CVR format changed, so the version needed to be
 *   incremented.
 *
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
export const v8 = {
  version: `8`,

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
    hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
    gloss: r.string().alias(`g`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
  }),
  hanziPinyinMistake: r.entity(`m/hp/[id]`, {
    id: r.string().alias(`i`),
    hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
    pinyin: rSpaceSeparatedString().alias(`p`),
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
    groupId: r.string().alias(`g`),
    themeId: r.string().alias(`t`),
  }),

  //
  // Mutators
  //
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
    groupId: r.string().alias(`g`),
    themeId: r.string().alias(`t`),
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
      hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
      gloss: r.string().alias(`g`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`shgm`),
  saveHanziPinyinMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
      /**
       * Intentionally left as strings because this is user input and might not
       * be valid pinyin.
       */
      pinyin: rSpaceSeparatedString().alias(`p`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`shpm`),

  //
  // Settings
  //
  setting: r.entity(`setting/[key]`, {
    // The setting identifier e.g. `autoCheck`
    key: r.string().alias(`k`),
    // Arbitrary JSON value (or null if unset), parsed by setting-specific
    // logic.
    value: r.jsonObject().nullable().alias(`v`),
  }),

  //
  // Mutators
  //
  setSetting: r
    .mutator({
      key: r.string().alias(`k`),
      value: r.jsonObject().nullable().alias(`v`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`ss`),
};

export const v9 = {
  ...omit(v8, [
    `setPinyinInitialAssociation`,
    `setPinyinFinalAssociation`,
    `setPinyinInitialGroupTheme`,
    `pinyinFinalAssociation`,
    `pinyinInitialAssociation`,
    `pinyinInitialGroupTheme`,
  ]),
  version: `9`,

  // Entities
  pinyinSound: r.entity(`ps/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    name: r.string().nullable().optional().alias(`n`),
  }),
  pinyinSoundGroup: r.entity(`psg/[soundGroupId]`, {
    soundGroupId: rPinyinSoundGroupId().alias(`g`),
    name: r.string().nullable().optional().alias(`n`),
    theme: r.string().nullable().optional().alias(`t`),
  }),

  // Mutators
  setPinyinSoundName: r
    .mutator({
      soundId: rPinyinSoundId().alias(`i`),
      name: r.string().nullable().alias(`n`),
      now: r.timestamp().alias(`t`),
    })
    .alias(`sps-n`),
  setPinyinSoundGroupName: r
    .mutator({
      soundGroupId: rPinyinSoundGroupId().alias(`i`),
      name: r.string().nullable().alias(`n`),
      now: r.timestamp().alias(`t`),
    })
    .alias(`spsg-n`),
  setPinyinSoundGroupTheme: r
    .mutator({
      soundGroupId: rPinyinSoundGroupId().alias(`i`),
      theme: r.string().nullable().alias(`x`),
      now: r.timestamp().alias(`t`),
    })
    .alias(`spsg-t`),
};

export const currentSchema = v9;

export const supportedSchemas = [v8, v9] as const;

export type Rizzle = RizzleReplicache<typeof currentSchema>;

export type SkillState = NonNullable<
  Awaited<ReturnType<typeof currentSchema.skillState.get>>
>;

export type SkillRating = NonNullable<
  Awaited<ReturnType<typeof currentSchema.skillRating.get>>
>;

export function srsStateFromFsrsState(fsrsState: FsrsState) {
  return {
    kind: SrsKind.FsrsFourPointFive,
    stability: fsrsState.stability,
    difficulty: fsrsState.difficulty,
    nextReviewAt: fsrsState.nextReviewAt,
    prevReviewAt: fsrsState.prevReviewAt,
  } satisfies SrsStateType;
}
