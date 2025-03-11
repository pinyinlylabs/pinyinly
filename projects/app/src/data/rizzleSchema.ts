import { memoize0, sortComparatorDate, weakMemoize1 } from "@/util/collections";
import { nextReview, Rating, UpcomingReview } from "@/util/fsrs";
import {
  invalid,
  r,
  RizzleCustom,
  RizzleReplicache,
  RizzleReplicacheMutators,
} from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import { z } from "zod";
import {
  HanziWord,
  MnemonicThemeId,
  PartOfSpeech,
  PinyinInitialGroupId,
  Skill,
  SkillType,
  SrsType,
} from "./model";

export const rSkillType = r.enum(SkillType, {
  [SkillType.Deprecated_RadicalToEnglish]: `re`,
  [SkillType.Deprecated_EnglishToRadical]: `er`,
  [SkillType.Deprecated_RadicalToPinyin]: `rp`,
  [SkillType.Deprecated_PinyinToRadical]: `pr`,
  [SkillType.Deprecated]: `xx`,
  [SkillType.HanziWordToEnglish]: `he`,
  [SkillType.HanziWordToPinyinInitial]: `hpi`,
  [SkillType.HanziWordToPinyinFinal]: `hpf`,
  [SkillType.HanziWordToPinyinTone]: `hpt`,
  [SkillType.EnglishToHanziWord]: `eh`,
  [SkillType.PinyinToHanziWord]: `ph`,
  [SkillType.ImageToHanziWord]: `ih`,
  [SkillType.PinyinInitialAssociation]: `pia`,
  [SkillType.PinyinFinalAssociation]: `pfa`,
});

export const rPartOfSpeech = r.enum(PartOfSpeech, {
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

export const rFsrsRating = r.enum(Rating, {
  [Rating.Again]: `1`,
  [Rating.Hard]: `2`,
  [Rating.Good]: `3`,
  [Rating.Easy]: `4`,
});

export const rPinyinInitialGroupId = r.enum(PinyinInitialGroupId, {
  [PinyinInitialGroupId.Basic]: `basic`,
  [PinyinInitialGroupId._i]: `-i`,
  [PinyinInitialGroupId._u]: `-u`,
  [PinyinInitialGroupId._v]: `-ü`,
  [PinyinInitialGroupId.Null]: `∅`,
  [PinyinInitialGroupId.Everything]: `everything`,
});

export const rMnemonicThemeId = r.enum(MnemonicThemeId, {
  [MnemonicThemeId.AnimalSpecies]: `AnimalSpecies`,
  [MnemonicThemeId.GreekMythologyCharacter]: `GreekMythologyCharacter`,
  [MnemonicThemeId.MythologyCharacter]: `MythologyCharacter`,
  [MnemonicThemeId.WesternCultureFamousMen]: `WesternCultureFamousMen`,
  [MnemonicThemeId.WesternCultureFamousWomen]: `WesternCultureFamousWomen`,
  [MnemonicThemeId.WesternMythologyCharacter]: `WesternMythologyCharacter`,
});

// Skill ID e.g. `he:好:good`
export type MarshaledSkill = string & z.BRAND<`SkillId`>;

const rSkillMarshalSchema = z
  .custom<Skill | MarshaledSkill>(
    (x) => typeof x === `string` || (typeof x === `object` && `type` in x),
  )
  .transform((x): MarshaledSkill => {
    if (typeof x === `string`) {
      return x;
    }

    const skillTypeM = rSkillType.marshal(x.type);
    switch (x.type) {
      // Hanzi word skills
      case SkillType.HanziWordToEnglish:
      case SkillType.HanziWordToPinyinInitial:
      case SkillType.HanziWordToPinyinFinal:
      case SkillType.HanziWordToPinyinTone:
      case SkillType.EnglishToHanziWord:
      case SkillType.PinyinToHanziWord:
      case SkillType.ImageToHanziWord:
        return `${skillTypeM}:${x.hanziWord}` as MarshaledSkill;
      // Pinyin association skills
      case SkillType.PinyinInitialAssociation:
        return `${skillTypeM}:${x.initial}` as MarshaledSkill;
      case SkillType.PinyinFinalAssociation:
        return `${skillTypeM}:${x.final}` as MarshaledSkill;
      // Deprecated
      case SkillType.Deprecated:
        return skillTypeM as MarshaledSkill;
    }
  });

export const rSkillMarshal = weakMemoize1((skill: Skill) =>
  rSkillMarshalSchema.parse(skill),
);

const rSkillUnmarshalSchema = z
  .custom<MarshaledSkill>((x) => typeof x === `string`)
  .transform((x, ctx): Skill => {
    if (x === rSkillType.marshal(SkillType.Deprecated)) {
      return { type: SkillType.Deprecated };
    }

    const result = /^(.+?):(.+)$/.exec(x);
    if (result === null) {
      return invalid(ctx, `doesn't match *:* pattern`);
    }

    const [, marshaledSkillType, rest] = result;
    if (marshaledSkillType == null) {
      return invalid(ctx, `couldn't parse skill type (before :)`);
    }
    if (rest == null) {
      return invalid(ctx, `couldn't parse skill params (after :)`);
    }

    const skillType = rSkillType.unmarshal(marshaledSkillType);

    switch (skillType) {
      case SkillType.HanziWordToEnglish:
      case SkillType.HanziWordToPinyinInitial:
      case SkillType.HanziWordToPinyinFinal:
      case SkillType.HanziWordToPinyinTone:
      case SkillType.EnglishToHanziWord:
      case SkillType.PinyinToHanziWord:
      case SkillType.ImageToHanziWord:
        return {
          type: skillType,
          hanziWord: rest as HanziWord,
        };
      case SkillType.PinyinInitialAssociation:
        return { type: skillType, initial: rest };
      case SkillType.PinyinFinalAssociation:
        return { type: skillType, final: rest };
      case SkillType.Deprecated:
      case SkillType.Deprecated_RadicalToEnglish:
      case SkillType.Deprecated_EnglishToRadical:
      case SkillType.Deprecated_RadicalToPinyin:
      case SkillType.Deprecated_PinyinToRadical:
        return { type: SkillType.Deprecated };
    }
  });

export const rSkillUnmarshal = rSkillUnmarshalSchema.parse.bind(
  rSkillUnmarshalSchema,
);

export const rSkill = memoize0(() =>
  RizzleCustom.create<Skill | MarshaledSkill, MarshaledSkill, Skill>(
    rSkillMarshalSchema,
    rSkillUnmarshalSchema,
  ),
);

export const rSrsType = memoize0(() =>
  r.enum(SrsType, {
    [SrsType.Null]: `0`,
    [SrsType.FsrsFourPointFive]: `1`,
  }),
);

export const rSrsState = memoize0(
  () =>
    // r.discriminatedUnion(`type`, [
    //   r.object({
    //     type: r.literal(SrsType.Null),
    //   }),
    r.object({
      type: r.literal(SrsType.FsrsFourPointFive, rSrsType()),
      stability: r.number(),
      difficulty: r.number(),
    }),
  // ]),
);

/**
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
export const v6 = {
  version: `6`,

  //
  // Skills
  //
  skillRating: r.entity(`sr/[id]`, {
    id: r.string().alias(`i`),
    skill: rSkill().alias(`s`).indexed(`bySkill`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    rating: rFsrsRating.alias(`r`),
  }),
  skillState: r.entity(`s/[skill]`, {
    skill: rSkill().alias(`s`),
    createdAt: r.datetime().alias(`c`),
    srs: rSrsState().nullable().alias(`r`),
    due: r.datetime().alias(`d`).indexed(`byDue`),
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
    groupId: rPinyinInitialGroupId.alias(`g`),
    themeId: rMnemonicThemeId.alias(`t`),
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
    groupId: rPinyinInitialGroupId.alias(`g`),
    themeId: rMnemonicThemeId.alias(`t`),
    now: r.timestamp().alias(`n`),
  }),
  rateSkill: r
    .mutator({
      id: r.string().alias(`i`),
      skill: rSkill().alias(`s`),
      rating: rFsrsRating.alias(`r`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`reviewSkill`),
  initSkillState: r
    .mutator({
      skill: rSkill().alias(`s`),
      now: r.timestamp().alias(`n`),
    })
    .alias(
      // Original deprecated name, kept for compatibility.
      `addSkillState`,
    ),
};

// This is a placeholder to keep code around that demonstrates how to support
// multiple schema versions at the same time.
export const v6_1 = {
  ...v6,
  version: `6.1`,
};

export const supportedSchemas = [v6] as const;

export type SupportedSchema = (typeof supportedSchemas)[number];

export type Rizzle = RizzleReplicache<typeof v6>;

export const v6Mutators: RizzleReplicacheMutators<typeof v6> = {
  async initSkillState(db, { skill, now }) {
    const exists = await db.skillState.has({ skill });
    if (!exists) {
      await db.skillState.set(
        { skill },
        { skill, due: now, createdAt: now, srs: null },
      );
    }
  },
  async rateSkill(tx, { id, skill, rating, now }) {
    // Save a record of the rating.
    await tx.skillRating.set({ id }, { id, rating, skill, createdAt: now });

    const skillRatingsByDate = await tx.skillRating
      .bySkill(skill)
      .toArray()
      .then((x) => x.sort(sortComparatorDate((x) => x[1].createdAt)));
    let state: UpcomingReview | null = null;
    for (const [, { rating, createdAt }] of skillRatingsByDate) {
      state = nextReview(state, rating, createdAt);
    }

    invariant(state !== null);

    await tx.skillState.set(
      { skill },
      {
        skill,
        createdAt: state.created,
        srs: {
          type: SrsType.FsrsFourPointFive,
          stability: state.stability,
          difficulty: state.difficulty,
        },
        due: state.due,
      },
    );
  },
  async setPinyinInitialAssociation(tx, { initial, name }) {
    await tx.pinyinInitialAssociation.set({ initial }, { initial, name });
  },
  async setPinyinFinalAssociation(tx, { final, name }) {
    await tx.pinyinFinalAssociation.set({ final }, { final, name });
  },
  async setPinyinInitialGroupTheme(tx, { groupId, themeId }) {
    await tx.pinyinInitialGroupTheme.set({ groupId }, { groupId, themeId });
  },
};

export type SkillRating = NonNullable<
  Awaited<ReturnType<typeof v6.skillRating.get>>
>;
