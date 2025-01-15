import { withDrizzle } from "@/server/lib/db";
import {
  pullRequestSchema,
  pullResponseSchema,
  pushRequestSchema,
  pushResponseSchema,
} from "@/util/rizzle";
import { pull, push } from "../lib/replicache";
import { authedProcedure, router } from "../lib/trpc";

export const replicacheRouter = router({
  push: authedProcedure
    .input(pushRequestSchema)
    .output(pushResponseSchema)
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;

      return await withDrizzle(
        async (db) =>
          await db.transaction((tx) => push(tx, userId, opts.input), {
            isolationLevel: `repeatable read`,
          }),
      );
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
