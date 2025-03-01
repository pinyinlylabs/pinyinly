import { createContext } from "@/server/lib/trpcContext";
import { appRouter } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = (req: Request) => {
  try {
    return fetchRequestHandler({
      endpoint: `/api/trpc`,
      req,
      router: appRouter,
      createContext,
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const GET = handler;
export const POST = handler;
