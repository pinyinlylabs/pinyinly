import { trpc } from "@/client/trpc";
import { invariant } from "@haohaohow/lib/invariant";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DeepReadonly } from "ts-essentials";
import { z } from "zod";
import {
  clientStorageGet,
  useClientStorageMutation,
  useClientStorageQuery,
} from "./clientStorage";

const LEGACY_SESSION_ID_KEY = `sessionId`;

const AUTH_STATE_KEY = `authState`;

/**
 * Represents a session on the client, either anonymous or authenticated.
 *
 * An anonymous session can be "adopted" when signing in
 */
const clientSessionSchema = z.object({
  /**
   * This should be unique across all sessions.
   */
  replicacheDbName: z.string(),
  lastActive: z.date().optional(),
  /**
   * Server session ID. If null, the client session is anonymous.
   */
  serverSessionId: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
});

type ClientSession = z.infer<typeof clientSessionSchema>;

const authState2Schema = z.object({
  /**
   * The array is ordered, the first session is always the "active" session.
   */
  clientSessions: z.array(clientSessionSchema).min(1),
});

export type AuthState2 = z.infer<typeof authState2Schema>;

export type UseAuth2Data = DeepReadonly<{
  clientSession: ClientSession;
  allClientSessions: ClientSession[];
}>;

type AuthApi = {
  // `null` while loading
  data: UseAuth2Data | null;
  signInWithApple: (identityToken: string) => Promise<void>;
  signInExisting: (predicate: (session: ClientSession) => boolean) => void;
  signOut: () => void;
};

// TODO: how to handle being anonymous then logging in but there's an existing
// user. It's more like "switch user" than it is anything else. Maybe even in
// the anonymous case you should have to give your name? Only after you actually
// save some useful state.

export function useAuth(): AuthApi {
  // Step 1. Try to read the current version of the auth state from local storage.
  const authStateQuery = useClientStorageQuery(AUTH_STATE_KEY);
  const authStateMutation = useClientStorageMutation(AUTH_STATE_KEY);
  const legacySessionIdQuery = useClientStorageQuery(LEGACY_SESSION_ID_KEY);
  const legacySessionIdMutation = useClientStorageMutation(
    LEGACY_SESSION_ID_KEY,
  );

  // If there's no existing auth state create a new one (migrating the old way
  // sessions were stored on the client).

  // Helps ensure data is only migrated once to avoid race conditions.
  const [initComplete, setInitComplete] = useState(false);

  const doInitFirstSession =
    !authStateQuery.isPending &&
    !legacySessionIdQuery.isPending &&
    authStateQuery.data == null &&
    !initComplete;
  const legacySessionId = legacySessionIdQuery.data ?? undefined;
  useEffect(() => {
    if (doInitFirstSession) {
      const clientSession: ClientSession =
        legacySessionId == null
          ? // Migrate a legacy session ID to the new format.
            {
              // Putting the date in the DB name makes it easier to debug.
              replicacheDbName: `hao-${new Date().toISOString()}`,
            }
          : // Create a fresh blank session.
            {
              replicacheDbName: `hao`, // This was the previously hard-coded name of the database.
              serverSessionId: legacySessionId,
            };

      authStateMutation.mutate(
        JSON.stringify({
          clientSessions: [clientSession],
        } satisfies AuthState2),
      );

      setInitComplete(true);
    }
  }, [doInitFirstSession, authStateMutation, legacySessionId]);

  // Delete the old session ID storage if needed.
  const hasNewData = authStateQuery.data != null;
  useEffect(() => {
    if (legacySessionId != null && hasNewData) {
      legacySessionIdMutation.mutate(null);
    }
  }, [legacySessionIdMutation, legacySessionId, hasNewData]);

  const data = useMemo((): UseAuth2Data | null => {
    if (authStateQuery.data == null) {
      return null;
    }
    const { clientSessions } = authState2Schema.parse(
      JSON.parse(authStateQuery.data),
    );
    const clientSession = clientSessions[0];
    invariant(clientSession != null, `expected at least one client session`);
    const allClientSessions = clientSessions;
    return { clientSession, allClientSessions };
  }, [authStateQuery.data]);

  const signInWithAppleMutate = trpc.auth.signInWithApple.useMutation();

  const signInWithApple = useCallback(
    async (identityToken: string) => {
      invariant(data != null, `expected auth state to be initialized`);

      const { session /*, user */ } = await signInWithAppleMutate.mutateAsync({
        identityToken,
      });
      // Activate an existing session if one exists with a matching session ID.
      // TODO: also look for matching user ID first.
      const existingSession = data.allClientSessions.find(
        (s) => s.serverSessionId === session.id,
      );
      const newSession: ClientSession = existingSession ?? {
        replicacheDbName: `hao-${new Date().toISOString()}`,
        serverSessionId: session.id,
        // userId: session.userId, // TODO: implement
        // userName: session.userName, // TODO: implement
      };
      const newState: AuthState2 = {
        clientSessions: [
          newSession,
          ...data.allClientSessions.filter(
            (s) => s.replicacheDbName !== newSession.replicacheDbName,
          ),
        ],
      };
      authStateMutation.mutate(JSON.stringify(newState));
    },
    [authStateMutation, data, signInWithAppleMutate],
  );

  const signInExisting = useCallback<AuthApi[`signInExisting`]>(
    (predicate) => {
      invariant(data != null, `expected auth state to be initialized`);

      // Activate an existing session if one exists with a matching session ID.
      const existingSession = data.allClientSessions.find((x) => predicate(x));
      invariant(existingSession != null, `no session matched the predicate`);

      const newState: AuthState2 = {
        clientSessions: [
          existingSession,
          ...data.allClientSessions.filter(
            (s) => s.replicacheDbName !== existingSession.replicacheDbName,
          ),
        ],
      };
      authStateMutation.mutate(JSON.stringify(newState));
    },
    [authStateMutation, data],
  );

  const signOut = useCallback(() => {
    invariant(data != null, `expected auth state to be initialized`);

    // Find and use an existing "logged out" session if one exists.
    const existingSession = data.allClientSessions.find(
      (s) => s.serverSessionId == null,
    );
    const newSession: ClientSession = existingSession ?? {
      replicacheDbName: `hhh-${new Date().toISOString()}`,
    };
    const newState: AuthState2 = {
      clientSessions: [
        newSession,
        ...data.allClientSessions.filter(
          (s) => s.replicacheDbName !== newSession.replicacheDbName,
        ),
      ],
    };

    authStateMutation.mutate(JSON.stringify(newState));
  }, [authStateMutation, data]);

  //  Clear all stale data when switching session.
  {
    const queryClient = useQueryClient();
    const currentSessionId = data?.clientSession.serverSessionId;
    useEffect(() => {
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        currentSessionId; // It's critical that this is a dependency of the effect.

        void queryClient.invalidateQueries();
      };
    }, [currentSessionId, queryClient]);
  }

  return {
    data,
    signInWithApple,
    signInExisting,
    signOut,
  };
}

export async function getSessionId(): Promise<string | null> {
  const data = await clientStorageGet(AUTH_STATE_KEY);
  if (data == null) {
    return null;
  }
  const { clientSessions } = authState2Schema.parse(JSON.parse(data));
  return clientSessions[0]?.serverSessionId ?? null;
}
