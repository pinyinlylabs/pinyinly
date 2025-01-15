import { Rating } from "@/util/fsrs";
import { invalid, r, RizzleCustom } from "@/util/rizzle";
import memoize from "lodash/memoize";
import { z } from "zod";
import { Skill, SkillType, SrsType } from "./model";

export const rSkillType = r.enum(SkillType, {
  [SkillType.RadicalToEnglish]: `re`,
  [SkillType.EnglishToRadical]: `er`,
  [SkillType.RadicalToPinyin]: `rp`,
  [SkillType.PinyinToRadical]: `pr`,
  [SkillType.HanziWordToEnglish]: `he`,
  [SkillType.HanziWordToPinyinInitial]: `hpi`,
  [SkillType.HanziWordToPinyinFinal]: `hpf`,
  [SkillType.HanziWordToPinyinTone]: `hpt`,
  [SkillType.EnglishToHanzi]: `eh`,
  [SkillType.PinyinToHanzi]: `ph`,
  [SkillType.ImageToHanzi]: `ih`,
});

export const rFsrsRating = r.enum(Rating, {
  [Rating.Again]: `1`,
  [Rating.Hard]: `2`,
  [Rating.Good]: `3`,
  [Rating.Easy]: `4`,
});

// Skill ID e.g. `he:好`
export type MarshaledSkill = string & z.BRAND<`SkillId`>;

export const rSkill = memoize(() =>
  RizzleCustom.create<Skill | MarshaledSkill, MarshaledSkill, Skill>(
    z
      .custom<Skill | MarshaledSkill>(
        (x) => typeof x === `string` || (typeof x === `object` && `type` in x),
      )
      .transform((x): MarshaledSkill => {
        if (typeof x === `string`) {
          return x;
        }

        const skillTypeM = rSkillType.marshal(x.type);
        switch (x.type) {
          // Radical skills
          case SkillType.RadicalToEnglish:
          case SkillType.EnglishToRadical:
            return `${skillTypeM}:${x.hanzi}:${x.name}` as MarshaledSkill;
          case SkillType.RadicalToPinyin:
          case SkillType.PinyinToRadical:
            return `${skillTypeM}:${x.hanzi}:${x.pinyin}` as MarshaledSkill;
          // Hanzi skills
          case SkillType.HanziWordToEnglish:
          case SkillType.HanziWordToPinyinInitial:
          case SkillType.HanziWordToPinyinFinal:
          case SkillType.HanziWordToPinyinTone:
          case SkillType.EnglishToHanzi:
          case SkillType.PinyinToHanzi:
          case SkillType.ImageToHanzi:
            return `${skillTypeM}:${x.hanzi}` as MarshaledSkill;
        }
      }),
    z
      .custom<MarshaledSkill>((x) => typeof x === `string`)
      .transform((x, ctx): Skill => {
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

        const skillType_ = rSkillType.getUnmarshal().parse(marshaledSkillType);

        switch (skillType_) {
          case SkillType.RadicalToEnglish:
          case SkillType.EnglishToRadical: {
            const result = /^(.+):(.+)$/.exec(rest);
            if (result == null) {
              return invalid(
                ctx,
                `couldn't parse ${marshaledSkillType}: params`,
              );
            }
            const [, hanzi, name] = result;
            if (hanzi == null) {
              return invalid(
                ctx,
                `couldn't parse ${marshaledSkillType}: hanzi`,
              );
            }
            if (name == null) {
              return invalid(ctx, `couldn't parse ${marshaledSkillType}: name`);
            }
            return { type: skillType_, hanzi, name };
          }
          case SkillType.RadicalToPinyin:
          case SkillType.PinyinToRadical: {
            const result = /^(.+):(.+)$/.exec(rest);
            if (result == null) {
              return invalid(
                ctx,
                `couldn't parse ${marshaledSkillType}: params`,
              );
            }
            const [, hanzi, pinyin] = result;
            if (hanzi == null) {
              return invalid(
                ctx,
                `couldn't parse ${marshaledSkillType}: hanzi`,
              );
            }
            if (pinyin == null) {
              return invalid(
                ctx,
                `couldn't parse ${marshaledSkillType}: pinyin`,
              );
            }
            return { type: skillType_, hanzi, pinyin };
          }
          case SkillType.HanziWordToEnglish:
          case SkillType.HanziWordToPinyinInitial:
          case SkillType.HanziWordToPinyinFinal:
          case SkillType.HanziWordToPinyinTone:
          case SkillType.EnglishToHanzi:
          case SkillType.PinyinToHanzi:
          case SkillType.ImageToHanzi:
            return { type: skillType_, hanzi: rest };
        }
      }),
  ),
);

const rSrsType = memoize(() =>
  r.enum(SrsType, {
    [SrsType.Null]: `0`,
    [SrsType.FsrsFourPointFive]: `1`,
  }),
);

const rSrsState = memoize(
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

//
// Skills
//

export const skillRating = r.entity(`sr/[skill]/[createdAt]`, {
  skill: rSkill(),
  createdAt: r.datetime(),

  rating: rFsrsRating.alias(`r`),
});

export const skillState = r.entity(`s/[skill]`, {
  skill: rSkill(),

  createdAt: r.timestamp().alias(`c`),
  srs: rSrsState().nullable().alias(`s`),
  due: r.timestamp().alias(`d`).indexed(`byDue`),
});

export const initSkillState = r
  .mutator({
    skill: rSkill().alias(`s`),
    now: r.timestamp().alias(`n`),
  })
  .alias(
    // Original deprecated name, kept for compatibility.
    `addSkillState`,
  );

export const reviewSkill = r.mutator({
  skill: rSkill().alias(`s`),
  rating: rFsrsRating.alias(`r`),
  now: r.timestamp().alias(`n`),
});

//
// Pinyin mnemonics
//

export const pinyinInitialAssociation = r.entity(`pi/[initial]`, {
  initial: r.string(),
  name: r.string().alias(`n`),
});

export const pinyinFinalAssociation = r.entity(`pf/[final]`, {
  final: r.string(),
  name: r.string().alias(`n`),
});

export const setPinyinInitialAssociation = r.mutator({
  initial: r.string().alias(`i`),
  name: r.string().alias(`n`),
  now: r.timestamp().alias(`t`),
});

export const setPinyinFinalAssociation = r.mutator({
  final: r.string().alias(`f`),
  name: r.string().alias(`n`),
  now: r.timestamp().alias(`t`),
});

// --

export const schema = {
  initSkillState,
  pinyinFinalAssociation,
  pinyinInitialAssociation,
  setPinyinInitialAssociation,
  setPinyinFinalAssociation,
  reviewSkill,
  skillRating,
  skillState,
};
