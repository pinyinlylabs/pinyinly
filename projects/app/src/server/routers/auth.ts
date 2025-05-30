import { getLucia, getOrCreateUser } from "@/server/lib/auth";
import { withDrizzle } from "@/server/lib/db";
import { invariant } from "@haohaohow/lib/invariant";
import { parseJWT } from "oslo/jwt";
import { z } from "zod/v4";
import { procedure, router } from "../lib/trpc";

export const authRouter = router({
  signInWithApple: procedure
    .input(
      z.object({
        identityToken: z.string(),
      }),
    )
    .output(
      z
        .object({
          session: z.object({
            id: z.string(),
          }),
          user: z.object({
            id: z.string(),
            name: z.string().optional(),
          }),
        })
        .strict(),
    )
    .mutation(async (opts) => {
      // TODO: validate identity token, e.g. https://arctic.js.org/providers/apple

      const jwt = parseJWT(opts.input.identityToken);
      const subject = jwt?.subject;
      invariant(subject != null);

      const { session, userId } = await withDrizzle(async (db) => {
        const userId = await getOrCreateUser(db, {
          provider: `apple`,
          providerUserId: subject,
        });

        const lucia = getLucia(db);
        const session = await lucia.createSession(userId, {});

        return { session, userId };
      });

      return {
        session: { id: session.id },
        user: { id: userId },
      };
    }),
});
