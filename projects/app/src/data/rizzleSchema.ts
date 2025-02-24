import { nextReview, Rating, UpcomingReview } from "@/util/fsrs";
import {
  invalid,
  r,
  RizzleCustom,
  RizzleReplicache,
  RizzleReplicacheMutators,
} from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import memoize from "lodash/memoize";
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

export const rSkillMarshal =
  rSkillMarshalSchema.parse.bind(rSkillMarshalSchema);

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

export const rSkill = memoize(() =>
  RizzleCustom.create<Skill | MarshaledSkill, MarshaledSkill, Skill>(
    rSkillMarshalSchema,
    rSkillUnmarshalSchema,
  ),
);

export const rSrsType = memoize(() =>
  r.enum(SrsType, {
    [SrsType.Null]: `0`,
    [SrsType.FsrsFourPointFive]: `1`,
  }),
);

export const rSrsState = memoize(
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
export const v5 = {
  version: `5`,

  //
  // Skills
  //
  skillRating: r.entity(`sr/[skill]/[createdAt]`, {
    skill: rSkill(),
    createdAt: r.datetime(),

    rating: rFsrsRating.alias(`r`),
  }),
  skillState: r.entity(`s/[skill]`, {
    skill: rSkill(),

    createdAt: r.datetime().alias(`c`),
    srs: rSrsState().nullable().alias(`s`),
    due: r.datetime().alias(`d`).indexed(`byDue`),
  }),

  //
  // Pinyin mnemonics
  //
  pinyinFinalAssociation: r.entity(`pf/[final]`, {
    final: r.string(),
    name: r.string().alias(`n`),
  }),
  pinyinInitialAssociation: r.entity(`pi/[initial]`, {
    initial: r.string(),
    name: r.string().alias(`n`),
  }),
  pinyinInitialGroupTheme: r.entity(`pigt/[groupId]`, {
    groupId: rPinyinInitialGroupId,
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
  reviewSkill: r.mutator({
    skill: rSkill().alias(`s`),
    rating: rFsrsRating.alias(`r`),
    now: r.timestamp().alias(`n`),
  }),
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
export const v5_1 = {
  ...v5,
  version: `5.1`,
};

export const supportedSchemas = [v5] as const;

export type SupportedSchema = (typeof supportedSchemas)[number];

export type Rizzle = RizzleReplicache<typeof v5>;

export const v5Mutators: RizzleReplicacheMutators<typeof v5> = {
  async initSkillState(db, { skill, now }) {
    const exists = await db.skillState.has({ skill });
    if (!exists) {
      await db.skillState.set(
        { skill },
        { due: now, createdAt: now, srs: null },
      );
    }
  },
  async reviewSkill(tx, { skill, rating, now }) {
    // Save a record of the review.
    await tx.skillRating.set({ skill, createdAt: now }, { rating });

    let state: UpcomingReview | null = null;
    for await (const [{ createdAt: when }, { rating }] of tx.skillRating.scan({
      skill,
    })) {
      state = nextReview(state, rating, when);
    }

    invariant(state !== null);

    await tx.skillState.set(
      { skill },
      {
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
    await tx.pinyinInitialAssociation.set({ initial }, { name });
  },
  async setPinyinFinalAssociation(tx, { final, name }) {
    await tx.pinyinFinalAssociation.set({ final }, { name });
  },
  async setPinyinInitialGroupTheme(tx, { groupId, themeId }) {
    await tx.pinyinInitialGroupTheme.set({ groupId }, { themeId });
  },
};
