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
}
