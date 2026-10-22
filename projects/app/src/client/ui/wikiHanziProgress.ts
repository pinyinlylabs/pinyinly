import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import { SkillKind, SrsKind } from "@/data/model";
import {
  coerceRank,
  getHanziWordRank,
  hanziCharacterToWriting,
  hanziWordSkill,
  rankRules,
  rankToWithinLevelProgress,
} from "@/data/skills";
import type { RankNumber } from "@/data/skills";
import { fsrsStabilityThreshold } from "@/util/fsrs";
import { hanziFromHanziWord } from "@/dictionary";
import { isHanziCharacter } from "@/data/hanzi";
import { invariant } from "@pinyinly/lib/invariant";

export interface HanziWordSkillBreakdownItem {
  label: string;
  skill: Skill;
  contributesToWordLevel: boolean;
  progress: number;
  stabilityDays: number | null;
  targetStabilityDays: number;
  status: `Not started` | `Learning` | `Target reached`;
}

const rankGoalTargets = new Map<SkillKind, number>();
for (const rule of rankRules) {
  for (const goal of rule.goals) {
    rankGoalTargets.set(
      goal.skill,
      Math.max(rankGoalTargets.get(goal.skill) ?? 0, goal.stability),
    );
  }
}

export function getHanziWordSkillBreakdown({
  hanziWord,
  skillSrsStates,
}: {
  hanziWord: HanziWord;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}): HanziWordSkillBreakdownItem[] {
  const skills: {
    label: string;
    skill: Skill;
    skillKind: SkillKind;
    contributesToWordLevel: boolean;
  }[] = [
    {
      label: `Recognize meaning`,
      skill: hanziWordSkill(SkillKind.HanziWordToGloss, hanziWord),
      skillKind: SkillKind.HanziWordToGloss,
      contributesToWordLevel: true,
    },
    {
      label: `Type meaning`,
      skill: hanziWordSkill(SkillKind.HanziWordToGlossTyped, hanziWord),
      skillKind: SkillKind.HanziWordToGlossTyped,
      contributesToWordLevel: false,
    },
    {
      label: `Pronunciation initial`,
      skill: hanziWordSkill(SkillKind.HanziWordToPinyinInitial, hanziWord),
      skillKind: SkillKind.HanziWordToPinyinInitial,
      contributesToWordLevel: true,
    },
    {
      label: `Pronunciation final`,
      skill: hanziWordSkill(SkillKind.HanziWordToPinyinFinal, hanziWord),
      skillKind: SkillKind.HanziWordToPinyinFinal,
      contributesToWordLevel: true,
    },
    {
      label: `Pronunciation tone`,
      skill: hanziWordSkill(SkillKind.HanziWordToPinyinTone, hanziWord),
      skillKind: SkillKind.HanziWordToPinyinTone,
      contributesToWordLevel: false,
    },
    {
      label: `Type full pronunciation`,
      skill: hanziWordSkill(SkillKind.HanziWordToPinyinTyped, hanziWord),
      skillKind: SkillKind.HanziWordToPinyinTyped,
      contributesToWordLevel: true,
    },
  ];

  const hanzi = hanziFromHanziWord(hanziWord);
  if (isHanziCharacter(hanzi)) {
    skills.push({
      label: `Write character`,
      skill: hanziCharacterToWriting(hanzi),
      skillKind: SkillKind.HanziCharacterToWriting,
      contributesToWordLevel: false,
    });
  }

  return skills.map((item) => {
    const { skillKind, ...breakdownItem } = item;
    const srsState = skillSrsStates.get(item.skill);
    const targetStabilityDays = item.contributesToWordLevel
      ? rankGoalTargets.get(skillKind)
      : fsrsStabilityThreshold;
    invariant(
      targetStabilityDays != null,
      `missing rank goal target for ${skillKind}`,
    );
    const stabilityDays =
      srsState?.kind === SrsKind.FsrsFourPointFive ? srsState.stability : null;
    const progress =
      stabilityDays == null
        ? 0
        : Math.min(stabilityDays / targetStabilityDays, 1);
    return {
      ...breakdownItem,
      stabilityDays,
      targetStabilityDays,
      progress,
      status:
        stabilityDays == null
          ? `Not started`
          : progress >= 1
            ? `Target reached`
            : `Learning`,
    };
  });
}

export function getHanziWordsProgress({
  hanziWords,
  skillSrsStates,
}: {
  hanziWords: HanziWord[];
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}): { progress: number; rank: RankNumber } {
  const rankedMeanings = hanziWords.map((hanziWord) => {
    const rankedWord = getHanziWordRank({
      hanziWord,
      skillSrsStates,
      rankRules,
    });
    const rank = coerceRank(rankedWord.rank);
    return {
      rank,
      progress: rankToWithinLevelProgress({
        rank,
        completion: rankedWord.completion,
      }),
    };
  });
  if (rankedMeanings.length === 0) {
    return { progress: 0, rank: 0 };
  }
  return {
    progress:
      rankedMeanings.reduce((sum, meaning) => sum + meaning.progress, 0) /
      rankedMeanings.length,
    rank: coerceRank(
      Math.round(
        rankedMeanings.reduce((sum, meaning) => sum + meaning.rank, 0) /
          rankedMeanings.length,
      ),
    ),
  };
}
