import { httpSessionHeader } from "@/util/http";
import { TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { withDrizzle } from "./db";

export async function createContext({ req }: FetchCreateContextFnOptions) {
  async function getSessionFromHeader() {
    const sessionId = req.headers.get(httpSessionHeader);
    if (sessionId != null) {
      if (sessionId.length === 0) {
        throw new TRPCError({
          message: `empty session header value`,
          code: `BAD_REQUEST`,
        });
      }

      const session = await withDrizzle(async (db) => {
        const session = await db.query.authSession.findFirst({
          where: (t, { eq }) => eq(t.id, sessionId),
        });

        if (session == null || session.expiresAt < new Date()) {
          return null;
        }

        return session;
      });

      return session;
    }

    return null;
  }
  try {
    const session = await getSessionFromHeader();

    return {
      session,
    };
  } catch (error: unknown) {
    console.error(`error getting session from header:`, error);
    throw error;
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
