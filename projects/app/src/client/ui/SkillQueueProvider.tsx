import { useDb } from "@/client/hooks/useDb";
import {
  isStructuralHanziWordQuery,
  skillLearningGraphQuery,
} from "@/client/query";
import type { SrsStateType } from "@/data/model";
import type { Skill, SkillRating } from "@/data/rizzleSchema";
import type { SkillReviewQueue } from "@/data/skills";
import { skillReviewQueue } from "@/data/skills";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createContext, useEffect, useMemo, useState } from "react";

export type SkillQueueContextValue =
  | {
      loading: false;
      reviewQueue: SkillReviewQueue;
      skillSrsStates: Map<Skill, SrsStateType>;
      version: number;
    }
  | {
      loading: true;
    };

const Context = createContext<SkillQueueContextValue | null>(null);

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
    const db = useDb();

    const { data: skillLearningGraph, isLoading: isSkillLearningGraphLoading } =
      useQuery(skillLearningGraphQuery());
    const {
      data: isStructuralHanziWord,
      isLoading: isStructuralHanziWordLoading,
    } = useQuery(isStructuralHanziWordQuery());
    const {
      data: latestSkillRatingsData,
      isLoading: latestSkillRatingsisLoading,
    } = useLiveQuery(db.latestSkillRatings);
    const { data: skillStateData, isLoading: skillStatesisLoading } =
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
        new Map<Skill, Pick<SkillRating, `rating` | `createdAt`>>(
          latestSkillRatingsData.map((x) => [x.skill, x]),
        ),
      [latestSkillRatingsData],
    );

    useEffect(() => {
      if (
        latestSkillRatingsisLoading ||
        skillStatesisLoading ||
        isSkillLearningGraphLoading ||
        isStructuralHanziWordLoading
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
      });

      setSkillQueue((prev) => ({
        loading: false,
        reviewQueue,
        skillSrsStates,
        version: prev.loading ? 0 : prev.version + 1,
      }));
    }, [
      isSkillLearningGraphLoading,
      isStructuralHanziWord,
      isStructuralHanziWordLoading,
      latestSkillRatingsData,
      latestSkillRatingsisLoading,
      skillLearningGraph,
      skillSrsStates,
      latestSkillRatings,
      skillStatesisLoading,
    ]);

    const [skillQueue, setSkillQueue] = useState<SkillQueueContextValue>({
      loading: true,
    });

    return <Context.Provider value={skillQueue}>{children}</Context.Provider>;
  },
  { Context },
);
