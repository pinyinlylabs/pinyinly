import { router } from "@/server/lib/trpc";
import { aiRouter } from "./ai";
import { assetRouter } from "./asset";
import { authRouter } from "./auth";
import { debugRouter } from "./debug";
import { replicacheRouter } from "./replicache";

export const appRouter = router({
  ai: aiRouter,
  asset: assetRouter,
  auth: authRouter,
  debug: debugRouter,
  replicache: replicacheRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
