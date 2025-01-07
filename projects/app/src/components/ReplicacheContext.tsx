import { SrsType } from "@/data/model";
import { cookieSchema, r, RizzleReplicache } from "@/data/rizzle";
import { schema } from "@/data/rizzleSchema";
import { replicacheLicenseKey } from "@/env";
import { AppRouter } from "@/server/routers/_app";
import { nextReview, UpcomingReview } from "@/util/fsrs";
import { trpc } from "@/util/trpc";
import { invariant } from "@haohaohow/lib/invariant";
import { QueryKey, useQuery, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HTTPRequestInfo, PullResponseV1, ReadTransaction } from "replicache";
import { useAuth } from "./auth";
import { kvStore } from "./replicacheOptions";
import { sentryCaptureException, useRenderGuard } from "./util";

export type Rizzle = RizzleReplicache<typeof schema>;

const ReplicacheContext = createContext<Rizzle | null>(null);

export function ReplicacheProvider({ children }: React.PropsWithChildren) {
  const auth = useAuth();

  // Pull out stable references to the mutate functions to avoid reinstanciating
  // replicache each time the mutation state changes (e.g. pending -> success).
  const { mutateAsync: pushMutate } = trpc.replicache.push.useMutation();
  const { mutateAsync: pullMutate } = trpc.replicache.pull.useMutation();

  const rizzle = useMemo(() => {
    return r.replicache(
      {
        name: `hao`,
        schemaVersion: `3`,
        licenseKey: replicacheLicenseKey,
        kvStore,
        pusher: auth.isAuthenticated
          ? async (requestBody) => {
              invariant(requestBody.pushVersion === 1);

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
        puller: auth.isAuthenticated
          ? async (requestBody) => {
              invariant(requestBody.pullVersion === 1);
              const cookie = cookieSchema.parse(requestBody.cookie);
              invariant(typeof requestBody.cookie === `object`);

              const response = pullMutate({
                // Map ID to Id to match this project's naming conventions.
                clientGroupId: requestBody.clientGroupID,
                cookie,
                profileId: requestBody.profileID,
                pullVersion: requestBody.pullVersion,
                schemaVersion: requestBody.schemaVersion,
              }).then(
                (r) =>
                  (`error` in r
                    ? r
                    : {
                        lastMutationIDChanges: r.lastMutationIdChanges,
                        patch: r.patch,
                        cookie: r.cookie,
                      }) satisfies PullResponseV1,
              );

              return await trpcToReplicache(response);
            }
          : undefined,
      },
      schema,
      {
        async initSkillState(db, { skill, now }) {
          const exists = await db.skillState.has({ skill });
          if (!exists) {
            await db.skillState.set(
              { skill },
              { due: now, createdAt: now, srs: null },
            );
          }
        },
        async reviewSkill(tx, { skill, rating, now }) {
          // Save a record of the review.
          await tx.skillRating.set({ skill, createdAt: now }, { rating });

          let state: UpcomingReview | null = null;
          for await (const [
            { createdAt: when },
            { rating },
          ] of tx.skillRating.scan({ skill })) {
            state = nextReview(state, rating, when);
          }

          invariant(state !== null);

          await tx.skillState.set(
            { skill },
            {
              createdAt: state.created,
              srs: {
                type: SrsType.FsrsFourPointFive,
                stability: state.stability,
                difficulty: state.difficulty,
              },
              due: state.due,
            },
          );
        },
        async setPinyinInitialAssociation(tx, { initial, name }) {
          await tx.pinyinInitialAssociation.set({ initial }, { name });
        },
        async setPinyinFinalAssociation(tx, { final, name }) {
          await tx.pinyinFinalAssociation.set({ final }, { name });
        },
      },
    );
  }, [auth.isAuthenticated, pushMutate, pullMutate]);

  return (
    <ReplicacheContext.Provider value={rizzle}>
      {children}
    </ReplicacheContext.Provider>
  );
}

export function useReplicache() {
  const r = useContext(ReplicacheContext);
  invariant(r !== null);
  return r;
}

export function useRizzleQuery<QueryRet>(
  key: QueryKey,
  query: (r: Rizzle, tx: ReadTransaction) => Promise<QueryRet>,
) {
  const queryClient = useQueryClient();
  const r = useReplicache();

  // Improve debugging.
  useRenderGuard?.(useRizzleQuery.name);

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
        sentryCaptureException(e);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [stableKey, stableQuery, queryClient, r]);

  const result = useQuery({
    queryKey: key,
    queryFn: () => r.replicache.query((tx) => query(r, tx)),
    throwOnError: true,
  });

  return result;
}

type Result<QueryRet> =
  | {
      loading: true;
    }
  | {
      loading: false;
      data: QueryRet;
      error: false;
    }
  | {
      loading: false;
      data: undefined;
      error: true;
    };

export function useQueryOnce<QueryRet>(
  query: (tx: ReadTransaction) => Promise<QueryRet>,
): Result<QueryRet> {
  const r = useReplicache();
  const [result, setResult] = useState<Result<QueryRet>>({ loading: true });
  const queryRef = useRef(query);

  useEffect(() => {
    r.replicache.query(queryRef.current).then(
      (data) => {
        setResult({ loading: false, data, error: false });
      },
      (e: unknown) => {
        // eslint-disable-next-line no-console
        console.log(e);
        setResult({ loading: false, data: undefined, error: true });
      },
    );
  }, [r]);

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
  } catch (err) {
    sentryCaptureException(err);
    if (err instanceof TRPCClientError) {
      const trpcError = TRPCClientError.from<AppRouter>(err);
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
