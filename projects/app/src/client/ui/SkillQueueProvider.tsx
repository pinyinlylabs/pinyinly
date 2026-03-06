import {
  dictionaryQuery,
  getPrioritizedHanziWords,
  isStructuralHanziQuery,
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
import { useEffect, useMemo, useState } from "react";
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
export const SkillQueueProvider = Object.assign(
  function SkillQueueProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const db = useDb();

    const { data: baseTargetSkills, isLoading: isTargetSkillsLoading } =
      useQuery(targetSkillsQuery());
    const { data: isStructuralHanzi, isLoading: isStructuralHanziLoading } =
      useQuery(isStructuralHanziQuery);
    const { data: dictionary, isLoading: isDictionaryLoading } =
      useQuery(dictionaryQuery);
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

    const [skillQueue, setSkillQueue] = useState<SkillQueueContextValue>({
      loading: true,
    });

    const skillSrsStates = useMemo(
      () =>
        new Map<Skill, SrsStateType>(
          skillStateData.map((x) => [x.skill, x.srs]),
        ),
      [skillStateData],
    );

    const latestSkillRatings = useMemo(
      () =>
        new Map<Skill, LatestSkillRating>(
          latestSkillRatingsData.map((x) => [x.skill, x]),
        ),
      [latestSkillRatingsData],
    );

    // Compute priority skills from settings
    const prioritySkills = useMemo(() => {
      const prioritizedWords = getPrioritizedHanziWords(prioritySettingsData);
      return prioritizedWords.flatMap((w) => [
        hanziWordToGlossTyped(w),
        hanziWordToPinyinTyped(w),
      ]);
    }, [prioritySettingsData]);

    // Combine base target skills with priority skills
    const allTargetSkills = useMemo(() => {
      if (baseTargetSkills == null) {
        return [];
      }
      return [...baseTargetSkills, ...prioritySkills].filter(
        arrayFilterUnique(),
      );
    }, [baseTargetSkills, prioritySkills]);

    useEffect(() => {
      if (
        isLatestSkillRatingsLoading ||
        isSkillStatesLoading ||
        isTargetSkillsLoading ||
        isPrioritySettingsLoading ||
        isStructuralHanziLoading ||
        isDictionaryLoading
      ) {
        return;
      }

      if (
        allTargetSkills.length === 0 ||
        isStructuralHanzi == null ||
        dictionary == null
      ) {
        return;
      }

      // Build graph with combined target skills and priority words
      void (async () => {
        const graph = await skillLearningGraph({
          targetSkills: allTargetSkills,
        });

        // Recompute the review queue when inputs are ready
        const reviewQueue = skillReviewQueue({
          graph,
          skillSrsStates,
          latestSkillRatings,
          now: new Date(),
          isStructuralHanzi,
          dictionary,
          maxQueueItems: mockable.getMaxQueueItems(),
        });

        // oxlint-disable-next-line react-hooks-js/set-state-in-effect
        setSkillQueue((prev) => ({
          loading: false,
          reviewQueue,
          version: prev.loading ? 0 : prev.version + 1,
        }));
      })();
    }, [
      isLatestSkillRatingsLoading,
      isSkillStatesLoading,
      isTargetSkillsLoading,
      isPrioritySettingsLoading,
      isStructuralHanziLoading,
      isDictionaryLoading,
      allTargetSkills,
      isStructuralHanzi,
      dictionary,
      skillSrsStates,
      latestSkillRatings,
      latestSkillRatingsData,
    ]);

    return (
      <SkillQueueContext.Provider value={skillQueue}>
        {children}
      </SkillQueueContext.Provider>
    );
  },
  { Context: SkillQueueContext, mockable },
);
