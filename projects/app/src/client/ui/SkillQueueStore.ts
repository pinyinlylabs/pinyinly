import type { SrsStateType } from "@/data/model";
import type { Skill, SkillRating } from "@/data/rizzleSchema";
import type { SkillLearningGraph, SkillReviewQueue } from "@/data/skills";
import { skillReviewQueue } from "@/data/skills";
import { getIsStructuralHanziWord } from "@/dictionary/dictionary";
import { create } from "zustand";

export interface SkillQueueState {
  /**
   * The current skill review queue. Null if not yet computed.
   */
  reviewQueue: SkillReviewQueue | null;

  /**
   * The skill learning graph used for computing the queue.
   */
  skillGraph: SkillLearningGraph | null;

  /**
   * The skill SRS states that were used to compute the review queue.
   */
  skillSrsStates: Map<Skill, SrsStateType> | null;

  /**
   * The latest skill ratings that were used to compute the review queue.
   */
  latestSkillRatings: Map<Skill, SkillRating> | null;

  /**
   * Whether the queue is currently being computed.
   */
  isLoading: boolean;

  /**
   * The timestamp when the queue was last computed.
   */
  lastComputedAt: Date | null;

  /**
   * Error if the computation failed.
   */
  error: Error | null;

  /**
   * Monotonically increasing version number that increments every time
   * the queue is recomputed. Useful for waiting until queue updates.
   */
  version: number;

  /**
   * Compute/refresh the skill queue. This is lazy and will only compute if needed.
   */
  computeQueue: (force?: boolean) => Promise<void>;

  /**
   * Mark the queue as stale so it will be recomputed on next access.
   */
  invalidate: () => void;
}

/**
 * How long to cache the skill queue before considering it stale (in milliseconds).
 * Since the queue is expensive to compute and doesn't change frequently,
 * we cache it for a reasonable amount of time.
 */
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const createSkillQueueStore = () =>
  create<SkillQueueState>((set, get) => ({
    reviewQueue: null,
    skillSrsStates: null,
    skillGraph: null,
    latestSkillRatings: null,
    isLoading: false,
    lastComputedAt: null,
    error: null,
    version: 0,

    computeQueue: async (force = false) => {
      const state = get();

      // Check if we need to compute - skip if already loading or recently computed
      const now = new Date();
      const isStale =
        !state.lastComputedAt ||
        now.getTime() - state.lastComputedAt.getTime() > CACHE_DURATION_MS;

      if (!force && state.isLoading) {
        // Already computing, just wait
        return;
      }

      // No skillGraph yet
      if (state.skillGraph == null) {
        // eslint-disable-next-line no-console
        console.debug(
          `createSkillQueueStore: No skillGraph yet, cannot compute queue` satisfies HasNameOf<
            typeof createSkillQueueStore
          >,
        );
        return;
      }

      // No skillSrsStates yet
      if (state.skillSrsStates == null) {
        // eslint-disable-next-line no-console
        console.debug(
          `createSkillQueueStore: No skillSrsStates yet, cannot compute queue` satisfies HasNameOf<
            typeof createSkillQueueStore
          >,
        );
        return;
      }

      // No latestSkillRatings yet
      if (state.latestSkillRatings == null) {
        // eslint-disable-next-line no-console
        console.debug(
          `createSkillQueueStore: No latestSkillRatings yet, cannot compute queue` satisfies HasNameOf<
            typeof createSkillQueueStore
          >,
        );
        return;
      }

      if (
        !force &&
        !isStale &&
        state.reviewQueue !== null &&
        state.error === null
      ) {
        // Fresh data available, no need to recompute
        return;
      }

      // Start computation
      set({ isLoading: true, error: null });

      try {
        const isStructuralHanziWord = await getIsStructuralHanziWord();

        const reviewQueue = skillReviewQueue({
          graph: state.skillGraph,
          skillSrsStates: state.skillSrsStates,
          latestSkillRatings: state.latestSkillRatings,
          now,
          isStructuralHanziWord,
        });

        set((state) => ({
          reviewQueue,
          isLoading: false,
          lastComputedAt: now,
          error: null,
          version: state.version + 1,
        }));
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    invalidate: () => {
      // eslint-disable-next-line no-console
      console.debug(
        `createSkillQueueStore: invalidate` satisfies HasNameOf<
          typeof createSkillQueueStore
        >,
      );
      set({ lastComputedAt: null });
    },
  }));

export type SkillQueueStore = ReturnType<typeof createSkillQueueStore>;
