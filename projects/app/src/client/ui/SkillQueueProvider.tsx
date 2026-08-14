import {
  charactersJsonQuery,
  dictionaryQuery,
  getPrioritizedHanziWords,
  targetSkillsQuery,
} from "@/client/query";
import { useDb } from "@/client/ui/hooks/useDb";
import type { Skill, SrsStateType } from "@/data/model";
import type { LatestSkillRating } from "@/data/skills";
import {
  hanziWordToGlossTyped,
  hanziWordToPinyinTyped,
  skillLearningGraph,
  skillReviewQueue,
} from "@/data/skills";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import type { SkillQueueContextValue } from "./contexts";
import { SkillQueueContext } from "./contexts";

const mockable = {
  getMaxQueueItems: () => 1,
};

/**
 * Provides a global skill queue that's scoped to the session.
 *
 * The queue is lazily computed only when needed, making it cheap to render
 * multiple SessionStoreProviders (like on the login page) without computing
 * expensive skill queues for each account.
 *
 * The queue is automatically invalidated when the underlying Replicache data
 * changes, ensuring it stays up-to-date with user progress.
 */
function SkillQueueProvider({ children }: PropsWithChildren) {
  "use memo";
  const db = useDb();

  const { data: baseTargetSkills, isLoading: isTargetSkillsLoading } =
    useQuery(targetSkillsQuery());
  const { data: dictionary } = useQuery(dictionaryQuery);
  const { data: charactersJson } = useQuery(charactersJsonQuery);
  const {
    data: latestSkillRatingsData,
    isLoading: isLatestSkillRatingsLoading,
  } = useLiveQuery(
    (q) => q.from({ latestSkillRatings: db.latestSkillRatingsCollection }),
    [db.latestSkillRatingsCollection],
  );
  const { data: skillStateData, isLoading: isSkillStatesLoading } =
    useLiveQuery(
      (q) => q.from({ skillState: db.skillStateCollection }),
      [db.skillStateCollection],
    );
  const { data: prioritySettingsData, isLoading: isPrioritySettingsLoading } =
    useLiveQuery(
      (q) => q.from({ setting: db.settingCollection }),
      [db.settingCollection],
    );
  const {
    data: characterDecompositionData,
    isLoading: isCharacterDecompositionLoading,
  } = useLiveQuery(
    (q) => q.from({ decomposition: db.characterDecompositionsCollection }),
    [db.characterDecompositionsCollection],
  );

  const skillSrsStates = useMemo(
    () =>
      isSkillStatesLoading
        ? null
        : new Map<Skill, SrsStateType>(
            skillStateData.map((x) => [x.skill, x.srs]),
          ),
    [skillStateData, isSkillStatesLoading],
  );

  const latestSkillRatings = useMemo(
    () =>
      isLatestSkillRatingsLoading
        ? null
        : new Map<Skill, LatestSkillRating>(
            latestSkillRatingsData.map((x) => [x.skill, x]),
          ),
    [latestSkillRatingsData, isLatestSkillRatingsLoading],
  );

  // Compute priority skills from settings
  const prioritySkills = useMemo(() => {
    if (dictionary == null || isPrioritySettingsLoading) {
      return null;
    }
    const prioritizedWords = getPrioritizedHanziWords(
      prioritySettingsData,
      dictionary,
    );
    return prioritizedWords.flatMap((w) => [
      hanziWordToGlossTyped(w),
      hanziWordToPinyinTyped(w),
    ]);
  }, [prioritySettingsData, dictionary, isPrioritySettingsLoading]);

  // Combine base target skills with priority skills
  const allTargetSkills = useMemo(() => {
    if (prioritySkills == null) {
      return null;
    }

    if (baseTargetSkills == null) {
      return [];
    }
    return [...baseTargetSkills, ...prioritySkills].filter(arrayFilterUnique());
  }, [baseTargetSkills, prioritySkills]);

  const graph = useMemo(
    () =>
      dictionary == null ||
      charactersJson == null ||
      allTargetSkills == null ||
      allTargetSkills.length === 0 ||
      isCharacterDecompositionLoading ||
      isTargetSkillsLoading
        ? null
        : skillLearningGraph({
            targetSkills: allTargetSkills,
            decompositionData: characterDecompositionData,
            dictionary,
            charactersJson,
          }),
    [
      dictionary,
      charactersJson,
      characterDecompositionData,
      allTargetSkills,
      isCharacterDecompositionLoading,
      isTargetSkillsLoading,
    ],
  );

  // Recompute the review queue when inputs are ready
  const reviewQueue = useMemo(
    () =>
      graph == null ||
      dictionary == null ||
      skillSrsStates == null ||
      latestSkillRatings == null
        ? null
        : skillReviewQueue({
            graph,
            skillSrsStates,
            latestSkillRatings,
            now: new Date(),
            dictionary,
            maxQueueItems: mockable.getMaxQueueItems(),
          }),
    [graph, dictionary, skillSrsStates, latestSkillRatings],
  );

  const skillQueue: SkillQueueContextValue = useMemo(
    () =>
      reviewQueue == null ? { loading: true } : { loading: false, reviewQueue },
    [reviewQueue],
  );

  return (
    <SkillQueueContext.Provider value={skillQueue}>
      {children}
    </SkillQueueContext.Provider>
  );
}

SkillQueueProvider.Context = SkillQueueContext;
SkillQueueProvider.mockable = mockable;

export { SkillQueueProvider };
