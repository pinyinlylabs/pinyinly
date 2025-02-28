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

  const session = await getSessionFromHeader();

  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
