import {
  dictionaryQuery,
  isStructuralHanziQuery,
  skillLearningGraphQuery,
} from "@/client/query";
import { useDb } from "@/client/ui/hooks/useDb";
import type { Skill, SrsStateType } from "@/data/model";
import { skillReviewQueue } from "@/data/skills";
import type { LatestSkillRating } from "@/data/skills";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { SkillQueueContext } from "./contexts";
import type { SkillQueueContextValue } from "./contexts";

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

    const { data: skillLearningGraph, isLoading: isSkillLearningGraphLoading } =
      useQuery(skillLearningGraphQuery);
    const { data: isStructuralHanzi, isLoading: isStructuralHanziLoading } =
      useQuery(isStructuralHanziQuery);
    const { data: dictionary, isLoading: isDictionaryLoading } =
      useQuery(dictionaryQuery);
    const {
      data: latestSkillRatingsData,
      isLoading: isLatestSkillRatingsLoading,
    } = useLiveQuery((q) =>
      q.from({ latestSkillRatings: db.latestSkillRatingsCollection }),
    );
    const { data: skillStateData, isLoading: isSkillStatesLoading } =
      useLiveQuery((q) => q.from({ skillState: db.skillStateCollection }));

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

    useEffect(() => {
      if (
        isLatestSkillRatingsLoading ||
        isSkillStatesLoading ||
        isSkillLearningGraphLoading ||
        isStructuralHanziLoading ||
        isDictionaryLoading
      ) {
        return;
      }

      if (
        skillLearningGraph == null ||
        isStructuralHanzi == null ||
        dictionary == null
      ) {
        return;
      }

      // Recompute the review queue when inputs are ready
      const reviewQueue = skillReviewQueue({
        graph: skillLearningGraph,
        skillSrsStates,
        latestSkillRatings,
        now: new Date(),
        isStructuralHanzi,
        dictionary,
        maxQueueItems: mockable.getMaxQueueItems(),
      });

      setSkillQueue((prev) => ({
        loading: false,
        reviewQueue,
        version: prev.loading ? 0 : prev.version + 1,
      }));
    }, [
      isSkillLearningGraphLoading,
      isStructuralHanzi,
      isStructuralHanziLoading,
      latestSkillRatingsData,
      isLatestSkillRatingsLoading,
      skillLearningGraph,
      skillSrsStates,
      latestSkillRatings,
      isSkillStatesLoading,
      isDictionaryLoading,
      dictionary,
    ]);

    return (
      <SkillQueueContext.Provider value={skillQueue}>
        {children}
      </SkillQueueContext.Provider>
    );
  },
  { Context: SkillQueueContext, mockable },
);
