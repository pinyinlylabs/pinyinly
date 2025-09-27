import { trpc } from "@/client/trpc";
import { mutators } from "@/data/rizzleMutators";
import type { Rizzle } from "@/data/rizzleSchema";
import { currentSchema } from "@/data/rizzleSchema";
import type { AppRouter } from "@/server/routers/_app";
import { cookieSchema, r } from "@/util/rizzle";
import { invariant } from "@pinyinly/lib/invariant";
import * as Sentry from "@sentry/core";
import { TRPCClientError } from "@trpc/client";
import { createContext, useEffect, useMemo } from "react";
import type { HTTPRequestInfo, PullResponseV1 } from "replicache";
import { kvStore } from "./replicacheOptions";

const Context = createContext<Rizzle | null>(null);

export const ReplicacheProvider = Object.assign(
  function ReplicacheProvider({
    children,
    dbName,
    serverSessionId,
  }: React.PropsWithChildren<{ dbName: string; serverSessionId?: string }>) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.

    // Pull out stable references to the mutate functions to avoid reinstanciating
    // replicache each time the mutation state changes (e.g. pending -> success).
    const { mutateAsync: pushMutate } = trpc.replicache.push.useMutation();
    const { mutateAsync: pullMutate } = trpc.replicache.pull.useMutation();

    const isAuthenticated = serverSessionId != null;
    const rizzle = useMemo(() => {
      const rizzle = r.replicache(
        {
          name: dbName,
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
    }, [dbName, isAuthenticated, pushMutate, pullMutate]);

    // Reset state when
    useEffect(() => {
      return () => {
        // Close the previous Replicache instance to avoid it making requests
        // using the wrong session.
        void rizzle.replicache.close();
      };
    }, [rizzle]);

    return <Context.Provider value={rizzle}>{children}</Context.Provider>;
  },
  { Context },
);

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
