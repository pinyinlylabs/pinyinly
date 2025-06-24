import { trpc } from "@/client/trpc";
import type { RizzleEntityOutput } from "@/util/rizzle";
import { r } from "@/util/rizzle";
import { invariant } from "@pinyinly/lib/invariant";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod/v4";
import { deviceStorageGet } from "./deviceStorage";
import { useDeviceStorage } from "./hooks/useDeviceStorage";

/**
 * Represents a session on the client, either anonymous or authenticated.
 *
 * An anonymous session can be "adopted" when signing in
 */
const deviceSessionSchema = z.object({
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

type DeviceSession = z.infer<typeof deviceSessionSchema>;

// const authState2Schema = z.object({
//   /**
//    * The array is ordered, the first session is always the "active" session.
//    */
//   clientSessions: z.array(deviceSessionSchema).min(1),
// });

const authStateSetting = r.entity(`authState`, {
  deviceSessions: r
    .custom(z.array(deviceSessionSchema).min(1), z.array(deviceSessionSchema))
    .alias(`clientSessions`),
});

export type AuthState2 = RizzleEntityOutput<typeof authStateSetting>;

export type UseAuth2Data = DeepReadonly<{
  activeDeviceSession: DeviceSession;
  allDeviceSessions: DeviceSession[];
}>;

type AuthApi = {
  // `null` while loading
  data: UseAuth2Data | null;
  signInWithApple: (identityToken: string) => Promise<void>;
  /**
   * This is useful for local development on a phone when you can't use OAuth2
   * sign-in providers because the URL doesn't match.
   */
  signInWithServerSessionId: (serverSessionId: string) => void;
  signInToExistingDeviceSession: (
    predicate: (deviceSession: DeviceSession) => boolean,
  ) => boolean;
  signOut: () => void;
};

export function useAuth(): AuthApi {
  // Step 1. Try to read the current version of the auth state from local storage.
  const authStateQuery = useDeviceStorage(authStateSetting);

  // Helps ensure data is only migrated once to avoid race conditions.
  const [initComplete, setInitComplete] = useState(false);

  const doInitFirstSession =
    !authStateQuery.isLoading && authStateQuery.value == null && !initComplete;
  useEffect(() => {
    if (doInitFirstSession) {
      // Create a new anonymous session.
      authStateQuery.setValue({
        deviceSessions: [
          {
            // Putting the date in the DB name makes it easier to debug.
            replicacheDbName: `hao-${new Date().toISOString()}`,
          },
        ],
      });

      setInitComplete(true);
    }
  }, [doInitFirstSession, authStateQuery]);

  const data = useMemo((): UseAuth2Data | null => {
    if (authStateQuery.isLoading) {
      return null;
    }

    if (authStateQuery.value === null) {
      // This should only happen in the app initialization phase when there's no
      // data in the device storage.
      //
      // The useEffect above should create a new session immediately.
      return null;
    }

    const activeDeviceSession = authStateQuery.value.deviceSessions[0];
    invariant(
      activeDeviceSession != null,
      `expected at least one device session`,
    );
    const allDeviceSessions = authStateQuery.value.deviceSessions;
    return {
      activeDeviceSession,
      allDeviceSessions,
    };
  }, [authStateQuery.isLoading, authStateQuery.value]);

  const signInWithAppleMutate = trpc.auth.signInWithApple.useMutation();

  const signInWithApple = useCallback(
    async (identityToken: string) => {
      invariant(data != null, `expected auth state to be initialized`);

      const { session /*, user */ } = await signInWithAppleMutate.mutateAsync({
        identityToken,
      });
      // Activate an existing session if one exists with a matching session ID.
      // TODO: also look for matching user ID first.
      const existingSession = data.allDeviceSessions.find(
        (s) => s.serverSessionId === session.id,
      );
      const newSession: DeviceSession =
        existingSession ??
        makeDeviceSession({
          serverSessionId: session.id,
          // userId: session.userId, // TODO: implement
          // userName: session.userName, // TODO: implement
        });
      const newState: AuthState2 = {
        deviceSessions: [
          newSession,
          ...data.allDeviceSessions.filter(
            (s) => s.replicacheDbName !== newSession.replicacheDbName,
          ),
        ],
      };
      authStateQuery.setValue(newState);
    },
    [authStateQuery, data, signInWithAppleMutate],
  );

  const signInToExistingDeviceSession = useCallback<
    AuthApi[`signInToExistingDeviceSession`]
  >(
    (predicate) => {
      invariant(data != null, `expected auth state to be initialized`);

      // Activate an existing session if one exists matching the predicate.
      const existingSession = data.allDeviceSessions.find((x) => predicate(x));
      if (existingSession == null) {
        return false;
      }

      authStateQuery.setValue({
        deviceSessions: [
          existingSession,
          ...data.allDeviceSessions.filter(
            (s) => s.replicacheDbName !== existingSession.replicacheDbName,
          ),
        ],
      });

      return true;
    },
    [authStateQuery, data],
  );

  const signInWithServerSessionId = useCallback<
    AuthApi[`signInWithServerSessionId`]
  >(
    (serverSessionId: string) => {
      invariant(data != null, `expected auth state to be initialized`);

      // Try activating an existing session first.
      const usedExisting = signInToExistingDeviceSession(
        (s) => s.serverSessionId === serverSessionId,
      );
      if (usedExisting) {
        return;
      }

      const newSession = makeDeviceSession({ serverSessionId });
      authStateQuery.setValue({
        deviceSessions: [newSession, ...data.allDeviceSessions],
      });
    },
    [authStateQuery, data, signInToExistingDeviceSession],
  );

  const signOut = useCallback(() => {
    invariant(data != null, `expected auth state to be initialized`);

    // Find and use an existing "logged out" session if one exists (even if it's
    // the same one).
    const existingSession = data.allDeviceSessions.find(
      (s) => s.serverSessionId == null,
    );
    const newSession: DeviceSession = existingSession ?? makeDeviceSession();

    authStateQuery.setValue({
      deviceSessions: [
        newSession,
        ...data.allDeviceSessions.filter(
          (s) => s.replicacheDbName !== newSession.replicacheDbName,
        ),
      ],
    });
  }, [authStateQuery, data]);

  // Reset local state when switching device sessions.
  {
    const queryClient = useQueryClient();
    const activeServerSessionId = data?.activeDeviceSession.serverSessionId;
    useEffect(() => {
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        activeServerSessionId; // It's critical that this is a dependency of the effect.

        void queryClient.invalidateQueries();
      };
    }, [activeServerSessionId, queryClient]);
  }

  return {
    data,
    signInWithApple,
    signInToExistingDeviceSession,
    signInWithServerSessionId,
    signOut,
  };
}

function makeDeviceSession(
  opts?: Pick<DeviceSession, `serverSessionId`>,
): DeviceSession {
  return {
    ...opts,
    replicacheDbName: `hao-${new Date().toISOString()}`,
  };
}

export async function getServerSessionId(): Promise<string | null> {
  const data = await deviceStorageGet(authStateSetting);
  if (data == null) {
    return null;
  }
  return data.deviceSessions[0]?.serverSessionId ?? null;
}
