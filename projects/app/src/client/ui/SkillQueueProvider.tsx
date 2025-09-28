import { useDb } from "@/client/hooks/useDb";
import {
  isStructuralHanziWordQuery,
  skillLearningGraphQuery,
} from "@/client/query";
import type { SrsStateType } from "@/data/model";
import type { Skill } from "@/data/rizzleSchema";
import type { LatestSkillRating, SkillReviewQueue } from "@/data/skills";
import { skillReviewQueue } from "@/data/skills";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createContext, useEffect, useMemo, useState } from "react";
import type { DeepReadonly } from "ts-essentials";

export type SkillQueueContextValue = DeepReadonly<
  | {
      loading: false;
      reviewQueue: SkillReviewQueue;
      version: number;
    }
  | {
      loading: true;
    }
>;

const Context = createContext<SkillQueueContextValue | null>(null);

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
    const {
      data: isStructuralHanziWord,
      isLoading: isStructuralHanziWordsLoading,
    } = useQuery(isStructuralHanziWordQuery);
    const {
      data: latestSkillRatingsData,
      isLoading: isLatestSkillRatingsLoading,
    } = useLiveQuery(db.latestSkillRatings);
    const { data: skillStateData, isLoading: isSkillStatesLoading } =
      useLiveQuery(db.skillStateCollection);

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
        isStructuralHanziWordsLoading
      ) {
        return;
      }

      if (skillLearningGraph == null || isStructuralHanziWord == null) {
        return;
      }

      // Recompute the review queue when inputs are ready
      const reviewQueue = skillReviewQueue({
        graph: skillLearningGraph,
        skillSrsStates,
        latestSkillRatings,
        now: new Date(),
        isStructuralHanziWord,
        maxQueueItems: mockable.getMaxQueueItems(),
      });

      setSkillQueue((prev) => ({
        loading: false,
        reviewQueue,
        version: prev.loading ? 0 : prev.version + 1,
      }));
    }, [
      isSkillLearningGraphLoading,
      isStructuralHanziWord,
      isStructuralHanziWordsLoading,
      latestSkillRatingsData,
      isLatestSkillRatingsLoading,
      skillLearningGraph,
      skillSrsStates,
      latestSkillRatings,
      isSkillStatesLoading,
    ]);

    const [skillQueue, setSkillQueue] = useState<SkillQueueContextValue>({
      loading: true,
    });

    return <Context.Provider value={skillQueue}>{children}</Context.Provider>;
  },
  { Context, mockable },
);
