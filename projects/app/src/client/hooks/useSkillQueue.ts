import type { SkillQueueContextValue } from "@/client/ui/SkillQueueProvider";
import { SkillQueueProvider } from "@/client/ui/SkillQueueProvider";
import { invariant } from "@pinyinly/lib/invariant";
import { use } from "react";

/**
 * Hook to access the skill queue with automatic computation.
 *
 * Must be used within a SkillQueueProvider.
 *
 * The queue is lazily computed and automatically triggers computation
 * when the component mounts or when the queue becomes stale.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { reviewQueue, isLoading, error, version } = useSkillQueue();
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error error={error} />;
 *
 *   return <div>Queue items: {reviewQueue?.items.length ?? 0}</div>;
 * }
 * ```
 */
export function useSkillQueue(): SkillQueueContextValue {
  const store = use(SkillQueueProvider.Context);
  invariant(
    store !== null,
    `useSkillQueue must be used within a SkillQueueProvider` satisfies HasNameOf<
      typeof useSkillQueue
    >,
  );

  return store;

  // const queue = useStore(store);

  // // Automatically trigger computation when needed
  // useEffect(() => {
  //   // Compute if we don't have a queue yet, or if the queue is stale (invalidated)
  //   // This ensures recomputation after invalidation while avoiding UI flicker
  //   const needsComputation =
  //     (queue.reviewQueue == null || queue.lastComputedAt == null) &&
  //     !queue.isLoading &&
  //     queue.error == null;

  //   if (needsComputation) {
  //     void queue.computeQueue();
  //   }
  // }, [
  //   queue.reviewQueue,
  //   queue.lastComputedAt,
  //   queue.isLoading,
  //   queue.error,
  //   // This is subtle but critical, because it means when dependencies are
  //   // updated (e.g. queue.skillSrsStates or queue.skillGraph) that might unlock
  //   // the queue to actually be computed. Without this dependency, the queue
  //   // might never compute if it was initially missing data.
  //   queue,
  // ]);

  // return queue;
}
