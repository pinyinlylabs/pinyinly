import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import {
  coerceRank,
  getHanziWordRank,
  rankRules,
  rankToAbsoluteProgress,
} from "@/data/skills";
import type { RankNumber } from "@/data/skills";

export function getHanziWordsProgress({
  hanziWords,
  skillSrsStates,
}: {
  hanziWords: HanziWord[];
  skillSrsStates: Map<Skill, SrsStateType>;
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
      progress: rankToAbsoluteProgress({
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
