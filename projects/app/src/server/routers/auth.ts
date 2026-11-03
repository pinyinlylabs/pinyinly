import {
  getLucia,
  getOrCreateUser,
  createAccount,
  passkeyFinishAuthentication,
  passkeyFinishRegistration,
  passkeyStartRegistration,
} from "@/server/lib/auth";
import { withDrizzle } from "@/server/lib/db";
import { getPasskeyConfig } from "@/server/lib/passkey";
import { getUserDisplayName } from "@/server/lib/query";
import { authedProcedure, procedure, router } from "@/server/lib/trpc";
import * as schema from "@/server/pgSchema";
import { passkeyTransportEnumSchema } from "@/server/pgSchemaUtil";
import { invariant } from "@pinyinly/lib/invariant";
import type { IsEqual } from "@pinyinly/lib/types";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { parseJWT } from "oslo/jwt";
import { z } from "zod";

const credentialIdSchema = z.string().min(1).max(2048);
const encodedSchema = z.string().min(1).max(65_536);
const passkeyNameSchema = z.string().trim().min(1).max(100);

export const passkeyAuthenticationResponseSchema = z.object({
  id: credentialIdSchema,
  rawId: credentialIdSchema,
  authenticatorAttachment: z.enum([`cross-platform`, `platform`]).optional(),
  clientExtensionResults: z
    .object({
      appid: z.boolean(),
      credProps: z.object({ rk: z.boolean().optional() }),
      hmacCreateSecret: z.boolean(),
    })
    .partial(),
  response: z.object({
    authenticatorData: encodedSchema,
    clientDataJSON: encodedSchema,
    signature: encodedSchema,
    userHandle: encodedSchema.optional(),
  }),
  type: z.literal(`public-key`),
});

true satisfies IsEqual<
  z.infer<typeof passkeyAuthenticationResponseSchema>,
  AuthenticationResponseJSON
>;

export const passkeyRegistrationResponseSchema = z.object({
  id: credentialIdSchema,
  rawId: credentialIdSchema,
  authenticatorAttachment: z.enum([`cross-platform`, `platform`]).optional(),
  clientExtensionResults: z
    .object({
      appid: z.boolean().optional(),
      credProps: z.object({ rk: z.boolean().optional() }).optional(),
      hmacCreateSecret: z.boolean().optional(),
    })
    .optional()
    .default({}),
  type: z.literal(`public-key`),
  response: z.object({
    attestationObject: encodedSchema,
    clientDataJSON: encodedSchema,
    authenticatorData: encodedSchema.optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: encodedSchema.optional(),
    transports: z.array(passkeyTransportEnumSchema).optional(),
  }),
});

true satisfies IsEqual<
  z.infer<typeof passkeyRegistrationResponseSchema>,
  RegistrationResponseJSON
>;

const registrationInput = z.object({
  response: passkeyRegistrationResponseSchema,
  cookie: z.string().min(1).max(2048),
  name: passkeyNameSchema.optional(),
});

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
            name: z.string().nullable(),
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

      const name = await withDrizzle(async (db) =>
        getUserDisplayName(db, userId),
      );

      return {
        session: { id: session.id },
        user: { id: userId, name },
      };
    }),

  createPasskeyAccount: procedure
    .input(
      z.object({
        displayName: z.string().trim().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => createAccount(input.displayName)),

  startAddPasskey: authedProcedure.mutation(async ({ ctx }) => {
    const displayName = await withDrizzle(async (db) =>
      getUserDisplayName(db, ctx.session.userId),
    );
    return passkeyStartRegistration({
      userName: displayName ?? `Pinyinly account`,
      userId: ctx.session.userId,
    });
  }),

  completeAddPasskey: authedProcedure
    .input(registrationInput)
    .mutation(async ({ input, ctx }) =>
      withDrizzle(async (db) =>
        db.transaction(async (tx) => {
          await passkeyFinishRegistration(tx, input, ctx.session);
          return { verified: true as const };
        }),
      ),
    ),

  startPasskeyAuthentication: procedure.mutation(async () => {
    const { rpId } = getPasskeyConfig();
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: `required`,
    });
    await withDrizzle(async (db) => {
      await db.insert(schema.authPasskeyChallenge).values({
        id: options.challenge,
        kind: `login`,
        rpId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
    });
    return { options, cookie: options.challenge };
  }),

  completePasskeyAuthentication: procedure
    .input(
      z.object({
        response: passkeyAuthenticationResponseSchema,
        cookie: z.string().min(1).max(2048),
      }),
    )
    .mutation(async ({ input }) => passkeyFinishAuthentication(input)),

  listPasskeys: authedProcedure.query(async ({ ctx }) =>
    withDrizzle(async (db) => {
      return db
        .select({
          id: schema.authPasskey.id,
          name: schema.authPasskey.name,
          createdAt: schema.authPasskey.createdAt,
          lastUsedAt: schema.authPasskey.lastUsedAt,
        })
        .from(schema.authPasskey)
        .where(eq(schema.authPasskey.userId, ctx.session.userId));
    }),
  ),

  renamePasskey: authedProcedure
    .input(z.object({ id: credentialIdSchema, name: passkeyNameSchema }))
    .mutation(async ({ input, ctx }) =>
      withDrizzle(async (db) => {
        const [updated] = await db
          .update(schema.authPasskey)
          .set({ name: input.name })
          .where(
            and(
              eq(schema.authPasskey.id, input.id),
              eq(schema.authPasskey.userId, ctx.session.userId),
            ),
          )
          .returning({ id: schema.authPasskey.id });
        if (updated == null) {
          throw new TRPCError({ code: `NOT_FOUND` });
        }
        return updated;
      }),
    ),

  removePasskey: authedProcedure
    .input(z.object({ id: credentialIdSchema }))
    .mutation(async ({ input, ctx }) =>
      withDrizzle(async (db) =>
        db.transaction(async (tx) => {
          // Serialize all removals for an account, including requests for different credentials.
          await tx
            .select({ id: schema.user.id })
            .from(schema.user)
            .where(eq(schema.user.id, ctx.session.userId))
            .for(`update`);
          const credentials = await tx
            .select({ id: schema.authPasskey.id })
            .from(schema.authPasskey)
            .where(eq(schema.authPasskey.userId, ctx.session.userId));
          if (!credentials.some(({ id }) => id === input.id)) {
            throw new TRPCError({ code: `NOT_FOUND` });
          }
          if (credentials.length <= 1) {
            throw new TRPCError({
              code: `BAD_REQUEST`,
              message: `Cannot remove your last passkey`,
            });
          }
          await tx
            .delete(schema.authPasskey)
            .where(eq(schema.authPasskey.id, input.id));
          return { removed: true };
        }),
      ),
    ),
});
