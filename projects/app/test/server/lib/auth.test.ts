import { passkeyConsumeChallenge } from "#server/lib/auth.ts";
import type { Transaction } from "#server/lib/db.ts";
import * as schema from "#server/pgSchema.ts";
import { dbTest } from "#test/server/lib/dbHelpers.ts";
import ms from "ms";
import { expect } from "vitest";

dbTest(`consumes a passkey challenge atomically`, async ({ db }) => {
  const challengeId = `concurrent-login-challenge`;
  await db.insert(schema.authPasskeyChallenge).values({
    id: challengeId,
    kind: `login`,
    rpId: `localhost`,
    expiresAt: new Date(Date.now() + ms(`60s`)),
  });
  expect(
    await db.query.authPasskeyChallenge.findFirst({
      where: (challenge, { eq }) => eq(challenge.id, challengeId),
    }),
  ).toMatchObject({ userId: null });

  const attempts = await Promise.allSettled([
    db.transaction(async (tx) =>
      passkeyConsumeChallenge(tx as Transaction, challengeId, `login`),
    ),
    db.transaction(async (tx) =>
      passkeyConsumeChallenge(tx as Transaction, challengeId, `login`),
    ),
  ]);

  expect(attempts.filter(({ status }) => status === `fulfilled`)).toHaveLength(
    1,
  );
  expect(attempts.filter(({ status }) => status === `rejected`)).toHaveLength(
    1,
  );
  expect(await db.query.authPasskeyChallenge.findMany()).toHaveLength(0);
});
