import { withDrizzle, withRepeatableReadTransaction } from "@/server/lib/db";
import {
  fetchedMutationSchema,
  fetchMutations,
  pull,
  pushChunked,
} from "@/server/lib/replicache";
import { authedProcedure, router } from "@/server/lib/trpc";
import {
  pullRequestSchema,
  pullResponseSchema,
  pushRequestSchema,
  pushResponseSchema,
} from "@/util/rizzle";
import { z } from "zod/v4";

export const replicacheRouter = router({
  push: authedProcedure
    .input(pushRequestSchema)
    .output(pushResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      return withDrizzle(async (db) => pushChunked(db, userId, opts.input));
    }),

  pull: authedProcedure
    .input(pullRequestSchema)
    .output(pullResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      return withDrizzle(async (db) =>
        withRepeatableReadTransaction(db, async (tx) =>
          pull(tx, userId, opts.input),
        ),
      );
    }),

  fetchMutations: authedProcedure
    .input(
      z
        .object({
          schemaVersions: z.array(z.string()),
          /**
           * The client last mutation ID as seen by the requester. This is used
           * to determine which mutations to return to the client.
           */
          lastMutationIds: z.record(z.string(), z.number()),
        })
        .strict(),
    )
    .output(
      z
        .object({
          mutations: z.array(fetchedMutationSchema),
        })
        .strict(),
    )
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      return withDrizzle(async (db) => fetchMutations(db, userId, opts.input));
    }),
});
