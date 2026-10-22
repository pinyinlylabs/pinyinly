import type { HanziCharacter, Skill, SrsStateType } from "#data/model.ts";
import { SkillKind, SrsKind } from "#data/model.ts";
import { hanziCharacterToWriting, hanziWordSkill } from "#data/skills.ts";
import { getHanziWordSkillBreakdown } from "#client/ui/wikiHanziProgress.ts";
import { describe, expect, test } from "vitest";

function fsrsState(stability: number): SrsStateType {
  return {
    kind: SrsKind.FsrsFourPointFive,
    prevReviewAt: new Date(0),
    nextReviewAt: new Date(0),
    stability,
    difficulty: 0,
  };
}

describe(`getHanziWordSkillBreakdown`, () => {
  test(`shows ranked and separate skill progress for a meaning`, () => {
    const hanziWord = `一:one`;
    const skillSrsStates = new Map<Skill, SrsStateType>([
      [hanziWordSkill(SkillKind.HanziWordToGloss, hanziWord), fsrsState(45)],
      [
        hanziWordSkill(SkillKind.HanziWordToPinyinInitial, hanziWord),
        fsrsState(15),
      ],
      [
        hanziWordSkill(SkillKind.HanziWordToPinyinTyped, hanziWord),
        fsrsState(45),
      ],
      [
        hanziWordSkill(SkillKind.HanziWordToGlossTyped, hanziWord),
        fsrsState(15),
      ],
    ]);

    expect(getHanziWordSkillBreakdown({ hanziWord, skillSrsStates })).toEqual([
      {
        label: `Recognize meaning`,
        skill: hanziWordSkill(SkillKind.HanziWordToGloss, hanziWord),
        contributesToWordLevel: true,
        stabilityDays: 45,
        targetStabilityDays: 30,
        progress: 1,
        status: `Target reached`,
      },
      {
        label: `Type meaning`,
        skill: hanziWordSkill(SkillKind.HanziWordToGlossTyped, hanziWord),
        contributesToWordLevel: false,
        stabilityDays: 15,
        targetStabilityDays: 30,
        progress: 0.5,
        status: `Learning`,
      },
      {
        label: `Pronunciation initial`,
        skill: hanziWordSkill(SkillKind.HanziWordToPinyinInitial, hanziWord),
        contributesToWordLevel: true,
        stabilityDays: 15,
        targetStabilityDays: 30,
        progress: 0.5,
        status: `Learning`,
      },
      {
        label: `Pronunciation final`,
        skill: hanziWordSkill(SkillKind.HanziWordToPinyinFinal, hanziWord),
        contributesToWordLevel: true,
        stabilityDays: null,
        targetStabilityDays: 30,
        progress: 0,
        status: `Not started`,
      },
      {
        label: `Pronunciation tone`,
        skill: hanziWordSkill(SkillKind.HanziWordToPinyinTone, hanziWord),
        contributesToWordLevel: false,
        stabilityDays: null,
        targetStabilityDays: 30,
        progress: 0,
        status: `Not started`,
      },
      {
        label: `Type full pronunciation`,
        skill: hanziWordSkill(SkillKind.HanziWordToPinyinTyped, hanziWord),
        contributesToWordLevel: true,
        stabilityDays: 45,
        targetStabilityDays: 30,
        progress: 1,
        status: `Target reached`,
      },
      {
        label: `Write character`,
        skill: hanziCharacterToWriting(`一` as HanziCharacter),
        contributesToWordLevel: false,
        stabilityDays: null,
        targetStabilityDays: 30,
        progress: 0,
        status: `Not started`,
      },
    ]);
  });

  test(`does not show character writing for multi-character words`, () => {
    const hanziWord = `中国:china`;

    expect(
      getHanziWordSkillBreakdown({
        hanziWord,
        skillSrsStates: new Map(),
      }).map((item) => item.label),
    ).toEqual([
      `Recognize meaning`,
      `Type meaning`,
      `Pronunciation initial`,
      `Pronunciation final`,
      `Pronunciation tone`,
      `Type full pronunciation`,
    ]);
  });
});
