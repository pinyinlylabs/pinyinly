import { getServerSessionId } from "@/client/auth";
import { useNewQueryClient } from "@/client/hooks/useNewQueryClient";
import { TrpcProvider } from "@/client/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";
import { DbProvider } from "./DbProvider";
import { ReplicacheProvider } from "./ReplicacheProvider";
import { SkillQueueProvider } from "./SkillQueueProvider";

/**
 * All the data/store contexts that should be scoped to a single device session.
 *
 * - <QueryClientProvider> -- so that queries between different device sessions
 *   don't conflict with each other.
 * - <TrpcProvider> -- so that authentication uses the server session ID
 *   associated with the device session.
 * - <ReplicacheProvider> -- so that `useRizzleQuery()` and `useReplicache()`
 *   fetched data is comes from the correct device session.
 * - <SkillQueueProvider> -- so that the skill queue is computed and cached
 *   per session, with lazy computation and automatic invalidation.
 */
export function SessionStoreProvider({
  children,
  dbName,
  serverSessionId,
}: PropsWithChildren<{
  dbName: string;
  /**
   * If nullish, the database will be opened in read-only mode.
   */
  serverSessionId?: string;
}>) {
  const queryClient = useNewQueryClient();

  return (
    <TrpcProvider
      queryClient={queryClient}
      getServerSessionId={getServerSessionId}
    >
      <QueryClientProvider client={queryClient}>
        <ReplicacheProvider dbName={dbName} serverSessionId={serverSessionId}>
          <DbProvider>
            <SkillQueueProvider>
              <Suspense
                // Use a <Suspense> here as a final safe-guard against trashing
                // Replicache+ReactQuery+etc  and causing them to re-initialize
                fallback={null}
              >
                {children}
              </Suspense>
            </SkillQueueProvider>
          </DbProvider>
        </ReplicacheProvider>
      </QueryClientProvider>
    </TrpcProvider>
  );
}
