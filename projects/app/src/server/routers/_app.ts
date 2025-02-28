import { router } from "../lib/trpc";
import { authRouter } from "./auth";
import { debugRouter } from "./debug";
import { replicacheRouter } from "./replicache";

export const appRouter = router({
  auth: authRouter,
  debug: debugRouter,
  replicache: replicacheRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
