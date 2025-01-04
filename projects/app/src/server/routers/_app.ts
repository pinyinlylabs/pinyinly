import { router } from "../lib/trpc";
import { authRouter } from "./auth";
import { replicacheRouter } from "./replicache";

export const appRouter = router({
  auth: authRouter,
  replicache: replicacheRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
