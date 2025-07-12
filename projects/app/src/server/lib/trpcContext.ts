import { httpSessionHeaderRx } from "@/util/http";
import { TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { withDrizzle } from "./db";

export async function createContext({ req }: FetchCreateContextFnOptions) {
  async function getSessionFromHeader() {
    const sessionId = httpSessionHeaderRx
      .map((header) => req.headers.get(header))
      .find((x) => x != null);

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
