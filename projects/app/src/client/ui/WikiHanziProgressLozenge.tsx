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

export function WikiHanziProgressLozenge({
  hanzi,
  hanziWord,
}: {
  hanzi: HanziText;
  hanziWord?: HanziWord | null;
}) {
  const db = useDb();
  const { data: dictionaryMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) =>
          and(eq(entry.hanzi, hanzi), eq(entry.sourceKind, `builtIn`)),
        ),
    [db.dictionaryCollection, hanzi],
  );
  const { data: userMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
    [db.userDictionary, hanzi],
  );
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );

  const hanziWords = [
    ...(hanziWord == null
      ? dictionaryMeanings.map((meaning) => meaning.hanziWord)
      : [hanziWord]),
    ...(hanziWord == null
      ? userMeanings.map((meaning) => buildHanziWord(hanzi, meaning.meaningKey))
      : []),
  ].filter((word, index, words) => words.indexOf(word) === index);
  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );
  const { progress, rank } = getHanziWordsProgress({
    hanziWords,
    skillSrsStates,
  });

  return <WikiHanziProgressLozengeDisplay progress={progress} rank={rank} />;
}

export function WikiHanziProgressLozengeDisplay({
  progress,
  rank,
}: {
  progress: number;
  rank: RankNumber;
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
      <Tooltip.Trigger
        accessibilityRole="button"
        accessibilityLabel={`${level.label}. ${level.description}`}
      >
        <Lozenge
          className={style.badgeClass}
          color={style.lozengeColor}
          progress={rank === 0 || rank === 4 ? undefined : visualProgress}
          progressClassName={style.badgeProgressClass}
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
      </Tooltip.Content>
    </Tooltip>
  );
}
