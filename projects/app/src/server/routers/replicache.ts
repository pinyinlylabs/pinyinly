import { withDrizzle } from "@/server/lib/db";
import {
  pullRequestSchema,
  pullResponseSchema,
  pushRequestSchema,
  pushResponseSchema,
} from "@/util/rizzle";
import chunk from "lodash/chunk";
import { pull, push } from "../lib/replicache";
import { authedProcedure, router } from "../lib/trpc";

export const replicacheRouter = router({
  push: authedProcedure
    .input(pushRequestSchema)
    .output(pushResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      // Commit mutations in batches, rather than trying to do it all at once
      // and timing out or locking the database. Each batch can be processed and
      // committed separately.
      for (const batch of chunk(opts.input.mutations, 5)) {
        const inputBatch: typeof opts.input = {
          ...opts.input,
          mutations: batch,
        };

        const result = await withDrizzle(
          async (db) =>
            await db.transaction((tx) => push(tx, userId, inputBatch), {
              isolationLevel: `repeatable read`,
            }),
        );

        // Return any errors immediately
        if (result != null) {
          return result;
        }
      }
    }),

  pull: authedProcedure
    .input(pullRequestSchema)
    .output(pullResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      const result = await withDrizzle(
        async (db) =>
          await db.transaction((tx) => pull(tx, userId, opts.input), {
            isolationLevel: `repeatable read`,
          }),
      );
      return result;
    }),
});
