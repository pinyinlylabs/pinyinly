import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import { useBookmarkToggle } from "./hooks/useBookmarkToggle";
import { rankPresentation, rankToWithinLevelProgress } from "@/data/skills";
import type { RankNumber } from "@/data/skills";
import { Lozenge } from "./Lozenge";
import { proficiencyFillProgress, proficiencyStyle } from "./proficiencyStyles";
import { DropdownMenu2 } from "./DropdownMenu2";
import { Text } from "./Text";
import { getHanziWordsProgress } from "./wikiHanziProgress";
import { WikiHanziSkillLevelBreakdownContent } from "./WikiHanziSkillLevelBreakdown";
import { BookmarkMenuItemDisplay } from "./WikiHanziBookmarkMenu";
import { ScrollView, useWindowDimensions } from "react-native";

export function WikiHanziProgressLozenge({
  hanziWord,
  skillSrsStates,
  hasPinyin,
}: {
  hanziWord: HanziWord;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  hasPinyin: boolean;
}) {
  const { isBookmarked, isLoading, toggle } = useBookmarkToggle(hanziWord);
  const { progress, rank } = getHanziWordsProgress({
    hanziWords: [hanziWord],
    skillSrsStates,
  });

  return (
    <WikiHanziProgressLozengeDisplay
      progress={progress}
      rank={rank}
      hanziWord={hanziWord}
      skillSrsStates={skillSrsStates}
      hasPinyin={hasPinyin}
      isBookmarked={isBookmarked}
      isBookmarkLoading={isLoading}
      onBookmarkToggle={toggle}
    />
  );
}

export function WikiHanziProgressLozengeDisplay({
  progress,
  rank,
  hanziWord,
  skillSrsStates,
  hasPinyin = false,
  isBookmarked = false,
  isBookmarkLoading = false,
  onBookmarkToggle,
}: {
  progress: number;
  rank: RankNumber;
  hanziWord?: HanziWord | null;
  skillSrsStates?: ReadonlyMap<Skill, SrsStateType>;
  hasPinyin?: boolean;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  onBookmarkToggle?: () => void;
}) {
  const { height } = useWindowDimensions();
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
    <DropdownMenu2>
      <DropdownMenu2.Trigger asChild>
        <Lozenge
          className={`
            ${style.badgeClass}

            shrink-0 self-center
          `}
          color={style.lozengeColor}
          progress={rank === 0 || rank === 4 ? undefined : visualProgress}
          progressClassName={style.badgeProgressClass}
          accessibilityRole="button"
          icon={isBookmarked ? `bookmark-filled` : undefined}
          iconTintColorClassName="accent-muted-fg"
          accessibilityLabel={`${level.label}. ${isBookmarked ? `Bookmarked` : `Not bookmarked`}. Bookmark and proficiency details`}
          onPress={(event) => {
            event.stopPropagation();
          }}
        >
          {level.label}
        </Lozenge>
      </DropdownMenu2.Trigger>
      <DropdownMenu2.Content
        align="start"
        sideOffset={6}
        className="w-80 max-w-[90vw] gap-2"
        onPress={(event) => {
          event.stopPropagation();
        }}
      >
        {onBookmarkToggle == null ? null : (
          <>
            <BookmarkMenuItemDisplay
              isBookmarked={isBookmarked}
              isLoading={isBookmarkLoading}
              toggle={onBookmarkToggle}
            />
            <DropdownMenu2.Separator />
          </>
        )}
        <ScrollView
          style={{ maxHeight: height * 0.6 }}
          contentContainerClassName="gap-2"
        >
          <Text className="font-sans text-sm font-semibold text-fg">
            {level.label}
          </Text>
          <Text className="font-sans text-sm text-fg">{level.description}</Text>
          <Text className="font-sans text-sm text-fg">
            Each word has its own proficiency level. Remembering it during
            practice helps it grow; repeated forgetting may lower it. The
            progress fill shows how close this word is to the next level and
            resets when it advances. Master is the highest level.
          </Text>
          {hanziWord == null || skillSrsStates == null ? null : (
            <WikiHanziSkillLevelBreakdownContent
              hanziWord={hanziWord}
              skillSrsStates={skillSrsStates}
              hasPinyin={hasPinyin}
            />
          )}
        </ScrollView>
      </DropdownMenu2.Content>
    </DropdownMenu2>
  );
}
