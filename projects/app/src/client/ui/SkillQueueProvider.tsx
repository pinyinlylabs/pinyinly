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
      console.log(`skillSrsStates changed`);
    }, [skillSrsStates]);

    useEffect(() => {
      console.log(`latestSkillRatings changed`);
    }, [latestSkillRatings]);

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

      // eslint-disable-next-line no-console
      console.debug(`recomputing skill queue…`);

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

    console.debug(`skillQueue:`, skillQueue);

    // Create a new store instance for this provider
    // Each session gets its own store to avoid conflicts
    // const [store] = useState(() => createSkillQueueStore());

    // useEffect(() => {
    //   if (skillLearningGraph != null) {
    //     store.setState({ skillGraph: skillLearningGraph });
    //   }
    // }, [skillLearningGraph, store]);

    // Set up automatic invalidation when Replicache data changes
    // useEffect(() => {
    //   const unsubscribeSkillState = rizzle.replicache.experimentalWatch(
    //     (ops) => {
    //       const skillSrsStates: SkillQueueState[`skillSrsStates`] =
    //         store.getState().skillSrsStates ?? new Map();

    //       // eslint-disable-next-line no-console
    //       console.debug(
    //         `SkillQueueProvider: processing ${ops.length} skillSrsStates ops…` satisfies HasNameOf<
    //           typeof SkillQueueProvider
    //         >,
    //       );

    //       for (const op of ops) {
    //         if (op.op === `add` || op.op === `change`) {
    //           if (op.newValue == null) {
    //             continue;
    //           }

    //           const skillState = currentSchema.skillState.unmarshalValue(
    //             // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    //             op.newValue as any,
    //           );

    //           skillSrsStates.set(skillState.skill, skillState.srs);
    //         }
    //       }

    //       store.setState({ skillSrsStates });

    //       // Whenever skill data changes, invalidate the queue so it will be recomputed next time
    //       store.getState().invalidate();
    //     },
    //     // Watch all changes by not specifying a prefix
    //     {
    //       prefix: currentSchema.skillState.keyPrefix,
    //       initialValuesInFirstDiff: true,
    //     },
    //   );

    //   const unsubscribeSkillRating = rizzle.replicache.experimentalWatch(
    //     (ops) => {
    //       const latestSkillRatings: SkillQueueState[`latestSkillRatings`] =
    //         store.getState().latestSkillRatings ?? new Map();

    //       // eslint-disable-next-line no-console
    //       console.debug(
    //         `SkillQueueProvider: processing ${ops.length} skillRating ops…` satisfies HasNameOf<
    //           typeof SkillQueueProvider
    //         >,
    //       );

    //       for (const op of ops) {
    //         if (op.op === `add` || op.op === `change`) {
    //           if (op.newValue == null) {
    //             continue;
    //           }

    //           const skillRating = currentSchema.skillRating.unmarshalValue(
    //             // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    //             op.newValue as any,
    //           );

    //           const existing = latestSkillRatings.get(skillRating.skill);

    //           // Only update if the new skill rating is more recent than the existing one
    //           if (
    //             existing == null ||
    //             skillRating.createdAt > existing.createdAt
    //           ) {
    //             latestSkillRatings.set(skillRating.skill, skillRating);
    //           }
    //         }
    //       }

    //       store.setState({ latestSkillRatings });

    //       // Whenever skill data changes, invalidate the queue so it will be recomputed next time
    //       store.getState().invalidate();
    //     },
    //     // Watch all changes by not specifying a prefix
    //     {
    //       prefix: currentSchema.skillRating.keyPrefix,
    //       initialValuesInFirstDiff: true,
    //     },
    //   );

    //   return () => {
    //     unsubscribeSkillState();
    //     unsubscribeSkillRating();
    //   };
    // }, [rizzle, store]);

    return <Context.Provider value={skillQueue}>{children}</Context.Provider>;
  },
  { Context },
);
