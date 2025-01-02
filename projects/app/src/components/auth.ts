import {
  useClientStorageMutation,
  useClientStorageQuery,
} from "@/util/clientStorage";
import { trpc } from "@/util/trpc";
import { useCallback } from "react";

const SESSION_ID_KEY = `sessionId`;

interface AuthState {
  isAuthenticated: boolean;
  sessionId: string | null;
  userId: string | null;
  signIn: (identityToken: string) => Promise<void>;
  signOut: () => void;
}

export function useAuth(): AuthState {
  const sessionIdQuery = useClientStorageQuery(SESSION_ID_KEY);
  const sessionIdMutation = useClientStorageMutation(SESSION_ID_KEY);
  const signInWithAppleMutate = trpc.auth.signInWithApple.useMutation();

  const signIn = useCallback(
    async (identityToken: string) => {
      const { session /*, user */ } = await signInWithAppleMutate.mutateAsync({
        identityToken,
      });
      sessionIdMutation.mutate(session.id);
    },
    [sessionIdMutation, signInWithAppleMutate],
  );

  const signOut = useCallback(() => {
    sessionIdMutation.mutate(null);
  }, [sessionIdMutation]);

  return {
    isAuthenticated: sessionIdQuery.data != null,
    sessionId: sessionIdQuery.data ?? null,
    userId: null, // TODO: Store user ID
    signIn,
    signOut,
  };
}
