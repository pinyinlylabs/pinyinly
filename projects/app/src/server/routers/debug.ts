import { authedProcedure, procedure, router } from "../lib/trpc";

export const debugRouter = router({
  anonymousError: procedure.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    throw new Error(`debug error`);
  }),

  authedError: authedProcedure.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    throw new Error(`debug error`);
  }),
});
