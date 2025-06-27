import { getLucia, getOrCreateUser } from "@/server/lib/auth";
import { withDrizzle } from "@/server/lib/db";
import { passkeyTransportEnumSchema } from "@/server/pgSchemaUtil";
import { jwtSchema, toJwtSchema } from "@/util/jwt";
import { nanoid } from "@/util/nanoid";
import type { IsEqual } from "@/util/types";
import { invariant } from "@pinyinly/lib/invariant";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { and, eq } from "drizzle-orm";
import { base64url } from "jose";
import { parseJWT } from "oslo/jwt";
import { z } from "zod/v4";
import { procedure, router } from "../lib/trpc";
import * as schema from "../pgSchema";

// Define RP (Relying Party) name and ID for the WebAuthn process
const RP_NAME = `Pinyinly`;
const RP_ID =
  process.env.NODE_ENV === `production` ? `pinyinly.com` : `localhost`;
const ORIGIN =
  process.env.NODE_ENV === `production`
    ? `https://pinyinly.com/login`
    : `http://localhost:8081`;

const textEncoder = new TextEncoder();

const passkeyRegistrationCookieSchema = z.object({
  challenge: z.string(),
  userId: z.string(),
  userName: z.string(),
});

const passkeyAuthenticationCookieSchema = z.object({
  challenge: z.string(),
});

export const passkeyAuthenticationResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(), // base64url-encoded
  authenticatorAttachment: z.enum([`cross-platform`, `platform`]).optional(),
  clientExtensionResults: z
    .object({
      appid: z.boolean(),
      credProps: z.object({ rk: z.boolean().optional() }),
      hmacCreateSecret: z.boolean(),
    })
    .partial(),
  response: z.object({
    authenticatorData: z.string(), // base64url-encoded
    clientDataJSON: z.string(), // base64url-encoded
    signature: z.string(), // base64url-encoded
    userHandle: z.string().optional(), // base64url-encoded
  }),
  type: z.literal(`public-key`),
});

true satisfies IsEqual<
  z.infer<typeof passkeyAuthenticationResponseSchema>,
  AuthenticationResponseJSON
>;

export const passkeyRegistrationResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  authenticatorAttachment: z.enum([`cross-platform`, `platform`]).optional(),
  clientExtensionResults: z
    .object({
      appid: z.boolean().optional(),
      credProps: z
        .object({
          rk: z.boolean().optional(),
        })
        .optional(),
      hmacCreateSecret: z.boolean().optional(),
    })
    .optional()
    .default({}),
  type: z.literal(`public-key`),
  response: z.object({
    attestationObject: z.string(),
    clientDataJSON: z.string(),
    authenticatorData: z.string().optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: z.string().optional(),
    transports: z.array(passkeyTransportEnumSchema).optional(),
  }),
});

true satisfies IsEqual<
  z.infer<typeof passkeyRegistrationResponseSchema>,
  RegistrationResponseJSON
>;

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

  // Start the passkey registration process
  startPasskeyRegistration: procedure
    .input(
      z.object({
        userName: z.string().optional(),
      }),
    )
    .output(
      z.object({
        options: z.custom<PublicKeyCredentialCreationOptionsJSON>(),
        cookie: passkeyRegistrationCookieSchema.pipe(
          toJwtSchema({ expirationTime: `5m` }),
        ),
      }),
    )
    .mutation(async (opts) => {
      // Create a new user ID that will eventually be used to create the user.
      const userId = nanoid();

      const userName = opts.input.userName ?? ``;

      // Generate registration options
      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userDisplayName: `user display name`,
        userName,
        userID: textEncoder.encode(userId),
      });

      return {
        options,
        cookie: { challenge: options.challenge, userId, userName },
      };
    }),

  // Complete the passkey registration process
  completePasskeyRegistration: procedure
    .input(
      z.object({
        response: passkeyRegistrationResponseSchema,
        cookie: jwtSchema().pipe(passkeyRegistrationCookieSchema),
      }),
    )
    .output(
      z.discriminatedUnion(`verified`, [
        z
          .object({
            verified: z.literal(true),
            session: z.object({ id: z.string() }),
            user: z.object({
              id: z.string(),
              name: z.string().nullable(),
            }),
          })
          .strict(),
        z.object({ verified: z.literal(false) }).strict(),
      ]),
    )
    .mutation(async (opts) => {
      const { cookie, response } = opts.input;

      // Verify the response
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: cookie.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || verification.registrationInfo == null) {
        return { verified: false };
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      return await withDrizzle(async (db) => {
        const [newUser] = await db
          .insert(schema.user)
          .values({
            id: cookie.userId,
            name: cookie.userName,
          })
          .returning();
        invariant(newUser !== undefined);

        // Save the new credential to the database
        await db
          .insert(schema.authPasskey)
          .values([
            {
              id: credential.id,
              userId: cookie.userId,
              publicKey: credential.publicKey,
              counter: credential.counter,
              transports: credential.transports,
              deviceType: credentialDeviceType,
              webauthnUserId: textEncoder.encode(cookie.userId),
              isBackedUp: credentialBackedUp,
            },
          ])
          .returning();

        // Create a new session
        const lucia = getLucia(db);
        const session = await lucia.createSession(newUser.id, {});

        return {
          verified: true,
          session: { id: session.id },
          user: { id: newUser.id, name: newUser.name },
        };
      });
    }),

  // Start the passkey authentication process
  startPasskeyAuthentication: procedure
    .output(
      z.object({
        options: z.custom<PublicKeyCredentialRequestOptionsJSON>(),
        cookie: passkeyAuthenticationCookieSchema.pipe(
          toJwtSchema({ expirationTime: `5m` }),
        ),
      }),
    )
    .mutation(async () => {
      const options = await generateAuthenticationOptions({ rpID: RP_ID });

      return {
        options,
        cookie: { challenge: options.challenge },
      };
    }),

  // Complete the passkey authentication
  completePasskeyAuthentication: procedure
    .input(
      z.object({
        response: passkeyAuthenticationResponseSchema,
        cookie: jwtSchema().pipe(passkeyAuthenticationCookieSchema),
      }),
    )
    .output(
      z.discriminatedUnion(`verified`, [
        z
          .object({
            verified: z.literal(true),
            session: z.object({ id: z.string() }),
            user: z.object({
              id: z.string(),
              name: z.string().nullable(),
            }),
          })
          .strict(),
        z.object({ verified: z.literal(false) }).strict(),
      ]),
    )
    .mutation(async (opts) => {
      const { response, cookie } = opts.input;

      return await withDrizzle(async (db) => {
        if (response.response.userHandle == null) {
          return { verified: false };
        }

        const credentialId = response.id;
        const webauthnUserId = base64url.decode(response.response.userHandle);

        const authPasskey = await db.query.authPasskey.findFirst({
          where: and(
            eq(schema.authPasskey.id, credentialId),
            eq(schema.authPasskey.webauthnUserId, webauthnUserId),
          ),
        });

        if (authPasskey == null) {
          return { verified: false };
        }

        // Verify the authentication response
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: cookie.challenge,
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
          credential: {
            id: authPasskey.id,
            publicKey: authPasskey.publicKey,
            counter: authPasskey.counter,
            transports: authPasskey.transports ?? undefined,
          },
        });

        if (!verification.verified) {
          return { verified: false };
        }

        // Update the counter in the database
        await db
          .update(schema.authPasskey)
          .set({
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date(),
          })
          .where(eq(schema.authPasskey.id, authPasskey.id));

        // Create a new session
        const lucia = getLucia(db);
        const session = await lucia.createSession(authPasskey.userId, {});

        // Get user data if needed
        const user = await db.query.user.findFirst({
          where: eq(schema.user.id, authPasskey.userId),
        });

        invariant(
          user !== undefined,
          `User not found for passkey authentication`,
        );

        return {
          verified: true,
          session: { id: session.id },
          user: { id: user.id, name: user.name },
        };
      });
    }),
});
