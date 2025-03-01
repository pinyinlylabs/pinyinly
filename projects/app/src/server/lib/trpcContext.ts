import { TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { withDrizzle } from "./db";

export async function createContext({ req }: FetchCreateContextFnOptions) {
  async function getSessionFromHeader() {
    const sessionId = req.headers.get(`x-hhh-session`);
    console.log(`headers=`, JSON.stringify([...req.headers.entries()]));
    console.log(`sessionId=`, sessionId);
    if (sessionId != null) {
      if (sessionId.length === 0) {
        throw new TRPCError({
          message: `empty x-hhh-session value`,
          code: `BAD_REQUEST`,
        });
      }

      console.debug(`process.env.DATABASE_URL=`, process.env[`DATABASE_URL`]);

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

      console.log(`session from db=`, session?.id);

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
