import {
  passkeyConsumeChallenge,
  passkeyStartRegistration,
} from "#server/lib/auth.ts";
import type { Transaction } from "#server/lib/db.ts";
import * as schema from "#server/pgSchema.ts";
import type { TestDb } from "#test/server/lib/dbHelpers.ts";
import { dbTest } from "#test/server/lib/dbHelpers.ts";
import ms from "ms";
import { afterEach, expect, vi } from "vitest";

const { mockWithDrizzle } = vi.hoisted(() => ({ mockWithDrizzle: vi.fn() }));
vi.mock(`#server/lib/db.ts`, async (importOriginal) => ({
  ...(await importOriginal<typeof import("#server/lib/db.ts")>()),
  withDrizzle: mockWithDrizzle,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  mockWithDrizzle.mockReset();
});

dbTest(
  `returns passkey registration options for named and fallback users`,
  async ({ db }) => {
    vi.stubEnv(`NODE_ENV`, `development`);
    mockWithDrizzle.mockImplementation(
      async (callback: (db: TestDb) => Promise<unknown>) => callback(db),
    );

    const options = [];
    for (const { userId, userDisplayName } of [
      { userId: `user-one`, userDisplayName: `Ada Learner` },
      { userId: `user-two`, userDisplayName: `` },
    ]) {
      await db.insert(schema.user).values({ id: userId });
      const result = await passkeyStartRegistration({
        userId,
        userDisplayName,
      });
      options.push({ ...result.options, challenge: `<random challenge>` });
    }

    expect(options).toMatchInlineSnapshot(`
      [
        {
          "attestation": "none",
          "authenticatorSelection": {
            "requireResidentKey": true,
            "residentKey": "required",
            "userVerification": "required",
          },
          "challenge": "<random challenge>",
          "excludeCredentials": [],
          "extensions": {
            "credProps": true,
          },
          "hints": [],
          "pubKeyCredParams": [
            {
              "alg": -8,
              "type": "public-key",
            },
            {
              "alg": -7,
              "type": "public-key",
            },
            {
              "alg": -257,
              "type": "public-key",
            },
          ],
          "rp": {
            "id": "localhost",
            "name": "Pinyinly",
          },
          "timeout": 60000,
          "user": {
            "displayName": "Ada Learner",
            "id": "dXNlci1vbmU",
            "name": "",
          },
        },
        {
          "attestation": "none",
          "authenticatorSelection": {
            "requireResidentKey": true,
            "residentKey": "required",
            "userVerification": "required",
          },
          "challenge": "<random challenge>",
          "excludeCredentials": [],
          "extensions": {
            "credProps": true,
          },
          "hints": [],
          "pubKeyCredParams": [
            {
              "alg": -8,
              "type": "public-key",
            },
            {
              "alg": -7,
              "type": "public-key",
            },
            {
              "alg": -257,
              "type": "public-key",
            },
          ],
          "rp": {
            "id": "localhost",
            "name": "Pinyinly",
          },
          "timeout": 60000,
          "user": {
            "displayName": "Pinyinly account",
            "id": "dXNlci10d28",
            "name": "",
          },
        },
      ]
    `);
  },
);

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
