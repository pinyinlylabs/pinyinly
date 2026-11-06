import * as schema from "@/server/pgSchema";
import {
  getExpectedPasskeyOrigin,
  getPasskeyConfig,
  passkeyNameFromAaguid,
  passkeyEncodeUserId,
} from "@/server/lib/passkey";
import { getUserDisplayName, setUserDisplayName } from "@/server/lib/query";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { invariant } from "@pinyinly/lib/invariant";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { TRPCError } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import { Lucia, TimeSpan } from "lucia";
import { base64url } from "jose";
import { withDrizzle } from "./db";
import type { Drizzle, Transaction } from "./db";
import ms from "ms";

export function passkeyInvalidCeremony(): never {
  throw new TRPCError({
    code: `BAD_REQUEST`,
    message: `Invalid or expired passkey request`,
  });
}

export async function passkeyConsumeChallenge(
  tx: Transaction,
  id: string,
  kind: `add` | `login`,
  userId?: string,
) {
  const { rpId } = getPasskeyConfig();
  const conditions = [
    eq(schema.authPasskeyChallenge.id, id),
    eq(schema.authPasskeyChallenge.kind, kind),
    eq(schema.authPasskeyChallenge.rpId, rpId),
    gt(schema.authPasskeyChallenge.expiresAt, new Date()),
  ];
  if (kind === `add`) {
    if (userId == null) {
      passkeyInvalidCeremony();
    }
    conditions.push(eq(schema.authPasskeyChallenge.userId, userId));
  }
  const [challenge] = await tx
    .delete(schema.authPasskeyChallenge)
    .where(and(...conditions))
    .returning();
  if (challenge == null) {
    passkeyInvalidCeremony();
  }
  return challenge;
}

export async function passkeyStartRegistration(opts: {
  userId: string;
  userDisplayName: string;
}) {
  const { rpId } = getPasskeyConfig();
  return withDrizzle(async (db) => {
    const credentials = await db.query.authPasskey.findMany({
      where: eq(schema.authPasskey.userId, opts.userId),
    });
    const options = await generateRegistrationOptions({
      rpName: `Pinyinly`,
      rpID: rpId,
      userName: ``,
      userDisplayName: opts.userDisplayName || `Pinyinly account`,
      userID: passkeyEncodeUserId(opts.userId),
      attestationType: `none`,
      authenticatorSelection: {
        residentKey: `required`,
        userVerification: `required`,
      },
      excludeCredentials: credentials.map((credential) => ({
        id: credential.id,
        transports: credential.transports ?? undefined,
      })),
    });
    await db.insert(schema.authPasskeyChallenge).values({
      id: options.challenge,
      kind: `add`,
      userId: opts.userId,
      rpId,
      expiresAt: new Date(Date.now() + ms(`5m`)),
    });
    return { options, cookie: options.challenge };
  });
}

export async function passkeyFinishRegistration(
  tx: Transaction,
  input: {
    cookie: string;
    response: RegistrationResponseJSON;
  },
  session: { userId: string },
) {
  const challenge = await passkeyConsumeChallenge(
    tx,
    input.cookie,
    `add`,
    session.userId,
  );
  if (challenge.userId !== session.userId) {
    passkeyInvalidCeremony();
  }
  const config = getPasskeyConfig();
  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: challenge.id,
    expectedOrigin: getExpectedPasskeyOrigin(
      config,
      input.response.response.clientDataJSON,
    ),
    expectedRPID: config.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified) {
    passkeyInvalidCeremony();
  }
  const { aaguid, credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;
  // Serialize registration per account so concurrent ceremonies choose distinct names.
  await tx
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, challenge.userId))
    .for(`update`);
  const existingNames = await tx
    .select({ name: schema.authPasskey.name })
    .from(schema.authPasskey)
    .where(eq(schema.authPasskey.userId, challenge.userId));
  await tx.insert(schema.authPasskey).values({
    id: credential.id,
    userId: challenge.userId,
    name: passkeyNameFromAaguid(
      aaguid,
      existingNames.map(({ name }) => name),
    ),
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports,
    deviceType: credentialDeviceType,
    isBackedUp: credentialBackedUp,
    aaguid,
  });
}

export async function passkeyFinishAuthentication(input: {
  cookie: string;
  response: AuthenticationResponseJSON;
}) {
  return withDrizzle(async (db) =>
    db.transaction(async (tx) => {
      const challenge = await passkeyConsumeChallenge(
        tx,
        input.cookie,
        `login`,
      );
      const config = getPasskeyConfig();
      const [credential] = await tx
        .select()
        .from(schema.authPasskey)
        .where(eq(schema.authPasskey.id, input.response.id))
        .for(`update`);
      if (
        credential == null ||
        input.response.response.userHandle == null ||
        base64url.encode(passkeyEncodeUserId(credential.userId)) !==
          input.response.response.userHandle
      ) {
        passkeyInvalidCeremony();
      }
      const verification = await verifyAuthenticationResponse({
        response: input.response,
        expectedChallenge: challenge.id,
        expectedOrigin: getExpectedPasskeyOrigin(
          config,
          input.response.response.clientDataJSON,
        ),
        expectedRPID: config.rpId,
        requireUserVerification: true,
        credential: {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports ?? undefined,
        },
      });
      if (!verification.verified) {
        passkeyInvalidCeremony();
      }
      await tx
        .update(schema.authPasskey)
        .set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
          isBackedUp: verification.authenticationInfo.credentialBackedUp,
        })
        .where(eq(schema.authPasskey.id, credential.id));
      const session = await getLucia(tx).createSession(credential.userId, {});
      const name = await getUserDisplayName(tx, credential.userId);
      return {
        verified: true as const,
        session: { id: session.id },
        user: { id: credential.userId, name },
      };
    }),
  );
}

export function getLucia(db: Drizzle) {
  const adapter = new DrizzlePostgreSQLAdapter(
    db,
    schema.authSession,
    schema.user,
  );
  return new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(365, `d`),
  });
}

export async function createAccount(displayName?: string) {
  return withDrizzle(async (db) =>
    db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.user).values({}).returning();
      invariant(user != null);
      if (displayName != null) {
        await setUserDisplayName(tx, user.id, displayName);
      }
      const session = await getLucia(tx).createSession(user.id, {});
      return {
        session: { id: session.id },
        user: { id: user.id, name: displayName ?? null },
      };
    }),
  );
}

export async function getOrCreateUser(
  db: Drizzle,
  options: {
    provider: string;
    providerUserId: string;
  },
) {
  const existingOAuth2 = await db.query.authOAuth2.findFirst({
    where: and(
      eq(schema.authOAuth2.provider, options.provider),
      eq(schema.authOAuth2.providerUserId, options.providerUserId),
    ),
  });

  // TODO: audit logging of when the method was used.

  if (existingOAuth2) {
    return existingOAuth2.userId;
  }

  // Create a new user
  const [newUser] = await db.insert(schema.user).values({}).returning();

  invariant(newUser !== undefined);

  // create a new OAuth2
  const [newOAuth2] = await db
    .insert(schema.authOAuth2)
    .values({
      provider: options.provider,
      providerUserId: options.providerUserId,
      userId: newUser.id,
    })
    .returning();

  invariant(newOAuth2 !== undefined);

  return newUser.id;
}
