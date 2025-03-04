import { withDrizzle } from "@/server/lib/db";
import {
  pullRequestSchema,
  pullResponseSchema,
  pushRequestSchema,
  pushResponseSchema,
} from "@/util/rizzle";
import { z } from "zod";
import {
  fetchedMutationSchema,
  fetchMutations,
  pull,
  withDrizzlePushChunked,
} from "../lib/replicache";
import { authedProcedure, router } from "../lib/trpc";

export const replicacheRouter = router({
  push: authedProcedure
    .input(pushRequestSchema)
    .output(pushResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      return await withDrizzlePushChunked(userId, opts.input);
    }),

  pull: authedProcedure
    .input(pullRequestSchema)
    .output(pullResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      return await withDrizzle(
        async (db) =>
          await db.transaction((tx) => pull(tx, userId, opts.input), {
            isolationLevel: `repeatable read`,
          }),
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

      return await withDrizzle(
        async (db) => await fetchMutations(db, userId, opts.input),
      );
    }),
});
