import { useDb } from "@/client/ui/hooks/useDb";
import type { HanziText, HanziWord, Skill, SrsStateType } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
import { rankPresentation, rankToWithinLevelProgress } from "@/data/skills";
import type { RankNumber } from "@/data/skills";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { Lozenge } from "./Lozenge";
import { proficiencyFillProgress, proficiencyStyle } from "./proficiencyStyles";
import { Tooltip } from "./Tooltip";
import { Text } from "./Text";
import { getHanziWordsProgress } from "./wikiHanziProgress";
import { WikiHanziSkillLevelBreakdownContent } from "./WikiHanziSkillLevelBreakdown";

export function WikiHanziProgressLozenge({
  hanzi,
  hanziWord,
  skillSrsStates,
}: {
  hanzi: HanziText;
  hanziWord?: HanziWord | null;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}) {
  const db = useDb();
  const { data: dictionaryMeanings } = useLiveQuery({
    query: (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) =>
          and(eq(entry.hanzi, hanzi), eq(entry.sourceKind, `builtIn`)),
        ),
  });
  const { data: userMeanings } = useLiveQuery({
    query: (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
  });
  const hasPinyin =
    hanziWord != null &&
    (dictionaryMeanings.some(
      (meaning) =>
        meaning.hanziWord === hanziWord && meaning.pinyin?.[0] != null,
    ) ||
      userMeanings.some(
        (meaning) =>
          buildHanziWord(hanzi, meaning.meaningKey) === hanziWord &&
          meaning.pinyin != null,
      ));
  const hanziWords = [
    ...(hanziWord == null
      ? dictionaryMeanings.map((meaning) => meaning.hanziWord)
      : [hanziWord]),
    ...(hanziWord == null
      ? userMeanings.map((meaning) => buildHanziWord(hanzi, meaning.meaningKey))
      : []),
  ].filter((word, index, words) => words.indexOf(word) === index);
  const { progress, rank } = getHanziWordsProgress({
    hanziWords,
    skillSrsStates,
  });

  return (
    <WikiHanziProgressLozengeDisplay
      progress={progress}
      rank={rank}
      hanziWord={hanziWord}
      skillSrsStates={skillSrsStates}
      hasPinyin={hasPinyin}
    />
  );
}

export function WikiHanziProgressLozengeDisplay({
  progress,
  rank,
  hanziWord,
  skillSrsStates,
  hasPinyin = false,
}: {
  progress: number;
  rank: RankNumber;
  hanziWord?: HanziWord | null;
  skillSrsStates?: ReadonlyMap<Skill, SrsStateType>;
  hasPinyin?: boolean;
}) {
  const level = rankPresentation[rank];
  const style = proficiencyStyle[level.color];
  const badgeProgress = rankToWithinLevelProgress({
    rank,
    completion: progress,
  });
  const visualProgress =
    rank === 0 || rank === 4
      ? badgeProgress
      : proficiencyFillProgress(badgeProgress);

  return (
    <Tooltip placement="top" sideOffset={6}>
      <Tooltip.Trigger asChild>
        <Lozenge
          className={style.badgeClass}
          color={style.lozengeColor}
          progress={rank === 0 || rank === 4 ? undefined : visualProgress}
          progressClassName={style.badgeProgressClass}
          accessibilityRole="button"
          accessibilityLabel={`${level.label}. ${level.description}`}
        >
          {level.label}
        </Lozenge>
      </Tooltip.Trigger>
      <Tooltip.Content className="gap-2">
        <Text className="font-sans text-sm font-semibold text-fg">
          {level.label}
        </Text>
        <Text className="font-sans text-sm text-fg">{level.description}</Text>
        <Text className="font-sans text-sm text-fg">
          Each word has its own proficiency level. Remembering it during
          practice helps it grow; repeated forgetting may lower it. The progress
          fill shows how close this word is to the next level and resets when it
          advances. Master is the highest level.
        </Text>
        {hanziWord == null || skillSrsStates == null ? null : (
          <WikiHanziSkillLevelBreakdownContent
            hanziWord={hanziWord}
            skillSrsStates={skillSrsStates}
            hasPinyin={hasPinyin}
          />
        )}
      </Tooltip.Content>
    </Tooltip>
  );
}
