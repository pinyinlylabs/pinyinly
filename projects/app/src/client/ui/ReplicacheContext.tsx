import { trpc } from "@/client/trpc";
import { mutators } from "@/data/rizzleMutators";
import type { Rizzle } from "@/data/rizzleSchema";
import { currentSchema } from "@/data/rizzleSchema";
import type { AppRouter } from "@/server/routers/_app";
import { cookieSchema, r } from "@/util/rizzle";
import type { ReactQueryValue } from "@/util/types";
import { invariant } from "@haohaohow/lib/invariant";
import * as Sentry from "@sentry/core";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { createContext, use, useEffect, useMemo } from "react";
import type {
  HTTPRequestInfo,
  PullResponseV1,
  ReadTransaction,
} from "replicache";
import { TEST_LICENSE_KEY } from "replicache";
import type { UseAuth2Data } from "../auth";
import { useAuth } from "../auth";
import { useLocalQuery } from "../hooks/useLocalQuery";
import { useRenderGuard } from "../hooks/useRenderGuard";
import { kvStore } from "./replicacheOptions";

const ReplicacheContext = createContext<Rizzle | null>(null);

function ReplicacheProviderWithDeps({
  children,
  auth,
}: React.PropsWithChildren<{ auth: UseAuth2Data }>) {
  // Pull out stable references to the mutate functions to avoid reinstanciating
  // replicache each time the mutation state changes (e.g. pending -> success).
  const { mutateAsync: pushMutate } = trpc.replicache.push.useMutation();
  const { mutateAsync: pullMutate } = trpc.replicache.pull.useMutation();

  const { replicacheDbName, serverSessionId } = auth.clientSession;
  const isAuthenticated = serverSessionId != null;
  const rizzle = useMemo(() => {
    const rizzle = r.replicache(
      {
        name: replicacheDbName,
        licenseKey:
          process.env.EXPO_PUBLIC_REPLICACHE_LICENSE_KEY ?? TEST_LICENSE_KEY,
        kvStore,
        // No need for a custom logSink here, just using normal console.*
        // functions are fine because `Sentry.captureConsoleIntegration`
        // captures them. See
        // https://docs.sentry.io/platforms/javascript/configuration/integrations/captureconsole/
        logSinks: undefined,
        pusher: isAuthenticated
          ? async (requestBody, requestId) => {
              invariant(requestBody.pushVersion === 1);

              Sentry.getActiveSpan()?.setAttribute(
                `replicache.requestId`,
                requestId,
              );

              const response = pushMutate({
                // Map ID to Id to match this project's naming conventions.
                clientGroupId: requestBody.clientGroupID,
                mutations: requestBody.mutations.map(
                  ({ clientID: clientId, ...rest }) => ({
                    ...rest,
                    clientId,
                  }),
                ),
                profileId: requestBody.profileID,
                pushVersion: requestBody.pushVersion,
                schemaVersion: requestBody.schemaVersion,
              });

              return await trpcToReplicache(response);
            }
          : undefined,
        puller: isAuthenticated
          ? async (requestBody, requestId) => {
              invariant(requestBody.pullVersion === 1);
              const cookie = cookieSchema.parse(requestBody.cookie);
              invariant(typeof requestBody.cookie === `object`);

              Sentry.getActiveSpan()?.setAttribute(
                `replicache.requestId`,
                requestId,
              );

              const response = pullMutate({
                // Map ID to Id to match this project's naming conventions.
                clientGroupId: requestBody.clientGroupID,
                cookie,
                profileId: requestBody.profileID,
                pullVersion: requestBody.pullVersion,
                schemaVersion: requestBody.schemaVersion,
              }).then((r): PullResponseV1 => {
                // More casing conventions mapping.
                if (`error` in r) {
                  return r;
                }

                if (r.partial) {
                  setTimeout(() => {
                    if (!rizzle.replicache.closed) {
                      rizzle.replicache
                        .pull({ now: true })
                        .catch((error: unknown) => {
                          console.error(
                            `Error pulling after partial pull`,
                            error,
                          );
                        });
                    }
                  }, 0);
                }

                return {
                  lastMutationIDChanges: r.lastMutationIdChanges,
                  patch: r.patch,
                  cookie: r.cookie,
                };
              });

              return await trpcToReplicache(response);
            }
          : undefined,
      },
      currentSchema,
      mutators,
    );
    return rizzle;
  }, [replicacheDbName, isAuthenticated, pushMutate, pullMutate]);

  // Reset state when
  useEffect(() => {
    return () => {
      // Close the previous Replicache instance to avoid it making requests
      // using the wrong session.
      void rizzle.replicache.close();
    };
  }, [rizzle]);

  return (
    <ReplicacheContext.Provider value={rizzle}>
      {children}
    </ReplicacheContext.Provider>
  );
}

export function ReplicacheProvider({ children }: React.PropsWithChildren) {
  const auth = useAuth();
  return auth.data ? (
    <ReplicacheProviderWithDeps auth={auth.data}>
      {children}
    </ReplicacheProviderWithDeps>
  ) : null;
}

export function useReplicache() {
  const r = use(ReplicacheContext);
  invariant(r !== null);
  return r;
}

export function useRizzleQuery<T extends ReactQueryValue>(
  key: QueryKey,
  query: (r: Rizzle, tx: ReadTransaction) => Promise<T>,
) {
  "use no memo";
  const queryClient = useQueryClient();
  const r = useReplicache();

  // Improve debugging.
  useRenderGuard(useRizzleQuery.name);

  // The reference for `key` usually changes on every render because the array
  // is written inline and changes on every render.
  //
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableKey = useMemo(() => key, key);

  // The reference for `query` usually changes on every render because the
  // function is written inline and the reference changes.
  //
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableQuery = useMemo(() => query, stableKey);

  useEffect(() => {
    const unsubscribe = r.replicache.subscribe((tx) => stableQuery(r, tx), {
      onData: (data) => {
        queryClient.setQueryData(stableKey, data);
      },
      onError: (e) => {
        console.error(e);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [stableKey, stableQuery, queryClient, r]);

  const result = useLocalQuery({
    queryKey: key,
    queryFn: () => r.replicache.query((tx) => query(r, tx)),
  });

  return result;
}

export function useRizzleQueryPaged<T extends ReactQueryValue>(
  key: QueryKey,
  query: (r: Rizzle) => Promise<T>,
) {
  const r = useReplicache();

  // Improve debugging.
  useRenderGuard(useRizzleQueryPaged.name);

  const result = useLocalQuery({
    queryKey: key,
    queryFn: () => query(r),
    // TODO: enable these after adding subscribing to replicache mutations and
    // invalidating the cache.
    //
    // refetchOnReconnect: false,
    // refetchOnWindowFocus: false,
    // refetchOnMount: false,
  });

  return result;
}

async function trpcToReplicache<T>(responsePromise: Promise<T>): Promise<{
  response?: T;
  httpRequestInfo: HTTPRequestInfo;
}> {
  try {
    const response = await responsePromise;
    return {
      response,
      httpRequestInfo: {
        errorMessage: ``,
        httpStatusCode: 200,
      },
    };
  } catch (error) {
    console.error(error);
    if (error instanceof TRPCClientError) {
      const trpcError = TRPCClientError.from<AppRouter>(error);
      return {
        httpRequestInfo: {
          errorMessage: trpcError.message,
          httpStatusCode: trpcError.data?.httpStatus ?? 1,
        },
      };
    }

    return {
      httpRequestInfo: {
        errorMessage: `unknown tRPC error`,
        httpStatusCode: 0,
      },
    };
  }
}
