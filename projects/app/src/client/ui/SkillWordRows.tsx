import { useDb } from "@/client/ui/hooks/useDb";
import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import {
  coerceRank,
  getHanziWordRank,
  rankPresentation,
  rankRules,
  rankToAbsoluteProgress,
  rankToWithinLevelProgress,
} from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { Link } from "expo-router";
import { Pressable } from "react-native";
import { HanziPinyinText } from "./HanziPinyinText";
import { HskLozengeWithTooltip } from "./HskLozengeWithTooltip";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { View } from "./View";
import { SkillProgressBar } from "./SkillProgressBar";

export function SkillWordRows({
  hanziWords,
  showHskLozenges = true,
  sortByProgress = true,
}: {
  hanziWords: readonly HanziWord[];
  showHskLozenges?: boolean;
  sortByProgress?: boolean;
}) {
  const db = useDb();
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );
  const { data: meanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => inArray(entry.hanziWord, [...hanziWords])),
    [db.dictionaryCollection, hanziWords],
  );
  const meaningsByWord = new Map(
    meanings.map((meaning) => [meaning.hanziWord, meaning]),
  );
  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );

  const rows = hanziWords.map((hanziWord) => {
    const rankedHanziWord = getHanziWordRank({
      hanziWord,
      skillSrsStates,
      rankRules,
    });
    const meaning = meaningsByWord.get(hanziWord);
    const rank = coerceRank(rankedHanziWord.rank);
    return {
      hanziWord,
      hanzi: hanziFromHanziWord(hanziWord),
      hsk: meaning?.hsk ?? null,
      hskFirstAppearance: meaning?.hskFirstAppearance ?? null,
      pinyin: meaning?.pinyin?.[0] ?? null,
      gloss: meaning?.gloss[0] ?? ``,
      rank,
      progress: rankToWithinLevelProgress({
        rank,
        completion: rankedHanziWord.completion,
      }),
      absoluteProgress: rankToAbsoluteProgress({
        rank,
        completion: rankedHanziWord.completion,
      }),
    };
  });
  if (sortByProgress) {
    rows.sort(
      (first, second) =>
        second.absoluteProgress - first.absoluteProgress ||
        first.hanzi.localeCompare(second.hanzi),
    );
  }

  return (
    <View className="-my-1.5 gap-1">
      {rows.map((row) => (
        <Link
          href={`/wiki/${encodeURIComponent(row.hanzi)}`}
          asChild
          key={row.hanziWord}
        >
          <Pressable className="flex flex-row items-center gap-2 py-1.5">
            <HanziPinyinText
              className="
                shrink-0

                sm:flex-1
              "
              hanzi={row.hanzi}
              pinyin={row.pinyin}
              lozenges={
                showHskLozenges ? (
                  <HskLozengeWithTooltip entries={[row]} size="sm" />
                ) : null
              }
            />
            <View className="ml-4 flex-1 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
              <Text
                className="
                  w-full text-right font-sans text-base text-fg

                  sm:flex-1
                "
                numberOfLines={2}
              >
                {row.gloss}
              </Text>
              <View className="w-21 items-end">
                <SkillProgressBar
                  progress={row.progress}
                  color={rankPresentation[row.rank].color}
                  accessibilityLabel={`${rankPresentation[row.rank].label} proficiency`}
                />
              </View>
            </View>
            <Icon
              icon="chevron-right"
              size={12}
              className="ml-2"
              tintColorClassName="accent-muted-fg"
            />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
