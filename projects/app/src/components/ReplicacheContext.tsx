import { SrsType } from "@/data/model";
import { r, RizzleReplicache } from "@/data/rizzle";
import { schema } from "@/data/rizzleSchema";
import { replicacheLicenseKey } from "@/env";
import { nextReview, UpcomingReview } from "@/util/fsrs";
import { invariant } from "@haohaohow/lib/invariant";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ReadTransaction } from "replicache";
import {
  useSubscribe as replicacheReactUseSubscribe,
  UseSubscribeOptions,
} from "replicache-react";
import { useAuth } from "./auth";
import { kvStore } from "./replicacheOptions";

export type Rizzle = RizzleReplicache<typeof schema>;

const ReplicacheContext = createContext<Rizzle | null>(null);

export function ReplicacheProvider({ children }: React.PropsWithChildren) {
  const auth = useAuth();
  const rizzle = useMemo(
    () =>
      r.replicache(
        {
          name: `hao`,
          schemaVersion: `3`,
          licenseKey: replicacheLicenseKey,
          auth: auth.sessionId ?? undefined,
          kvStore,
          pushURL: auth.sessionId != null ? `/api/replicache/push` : undefined,
          pullURL: auth.sessionId != null ? `/api/replicache/pull` : undefined,
          // async pusher(requestBody, requestID) {
          //   const postResult = await fetch(`/api/replicache/push`, {
          //     method: `POST`,
          //     body: JSON.stringify(requestBody),
          //     // TODO: send JWT with user ID
          //   });

          //   console.log(`postResult=`, postResult);
          //   // eslint-disable-next-line no-console
          //   console.log(
          //     `pusher(${JSON.stringify({ requestBody, requestID })})`,
          //   );
          //   throw new Error(`pushing not implemented`);
          // },
          // puller(req, requestID) {
          //   invariant(req.pullVersion === 1);

          //   // eslint-disable-next-line no-console
          //   console.log(`puller: rep.clientID =`, rep.clientID);

          //   // eslint-disable-next-line no-console
          //   console.log(`puller: puller(…) requestId=${requestID} req=`, req);

          //   return Promise.resolve({
          //     response: {
          //       cookie: req.cookie,
          //       lastMutationIDChanges: { [rep.clientID]: 0 },
          //       patch: [],
          //     },
          //     httpRequestInfo: {
          //       errorMessage: ``,
          //       httpStatusCode: 200,
          //     },
          //   } satisfies PullerResultV1);
          // },
        },
        schema,
        {
          async addSkillState(db, { skill, now }) {
            const exists = await db.skillState.has({ skill });
            if (!exists) {
              await db.skillState.set(
                { skill },
                { due: now, created: now, srs: null },
              );
            }
          },
          async reviewSkill(tx, { skill, rating, now }) {
            // Save a record of the review.
            await tx.skillReview.set({ skill, when: now }, { rating });

            let state: UpcomingReview | null = null;
            for await (const [{ when }, { rating }] of tx.skillReview.scan({
              skill,
            })) {
              state = nextReview(state, rating, when);
            }

            invariant(state !== null);

            await tx.skillState.set(
              { skill },
              {
                created: state.created,
                srs: {
                  type: SrsType.FsrsFourPointFive,
                  stability: state.stability,
                  difficulty: state.difficulty,
                },
                due: state.due,
              },
            );
          },
        },
      ),
    [auth.sessionId],
  );

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

export function useReplicacheSubscribe<QueryRet, Default = undefined>(
  query: (tx: ReadTransaction) => Promise<QueryRet>,
  options?: UseSubscribeOptions<QueryRet, Default>,
) {
  const r = useReplicache();
  // The types of replicache-react seem wonky and don't support passing in a
  // replicache instance.
  return replicacheReactUseSubscribe<ReadTransaction, QueryRet, Default>(
    r.replicache,
    query,
    options,
  );
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
