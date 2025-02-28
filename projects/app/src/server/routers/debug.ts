import { authedProcedure, procedure, router } from "../lib/trpc";

export const debugRouter = router({
  anonymousThrowError: procedure.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    throw new Error(`anonymousThrowError`);
  }),

  authedThrowError: authedProcedure.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    throw new Error(`authedThrowError`);
  }),

  anonymousLogError: procedure.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.error(new Error(`anonymousLogError`));
  }),

  authedLogError: authedProcedure.mutation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.error(new Error(`authedLogError`));
  }),
});
