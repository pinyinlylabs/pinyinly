import { TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { withDrizzle } from "./db";

export async function createContext({ req }: FetchCreateContextFnOptions) {
  async function getSessionFromHeader() {
    const sessionId = req.headers.get(`x-hhh-session`);
    if (sessionId != null) {
      if (sessionId.length === 0) {
        throw new TRPCError({
          message: `empty x-hhh-session value`,
          code: `BAD_REQUEST`,
        });
      }

      console.debug(`checkpoint 1`);
      const session = await withDrizzle(async (db) => {
        console.debug(`checkpoint 2`);
        const session = await db.query.authSession.findFirst({
          where: (t, { eq }) => eq(t.id, sessionId),
        });
        console.debug(`checkpoint 3`);

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
  } catch (e: unknown) {
    console.error(`error getting session from header:`, e);
    throw e;
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
