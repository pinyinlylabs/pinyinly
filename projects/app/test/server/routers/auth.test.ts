import { authRouter } from "#server/routers/auth.ts";
import * as s from "#server/pgSchema.ts";
import { dbTest } from "#test/server/lib/dbHelpers.ts";
import type { TestDb } from "#test/server/lib/dbHelpers.ts";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";

const { mockWithDrizzle } = vi.hoisted(() => ({ mockWithDrizzle: vi.fn() }));
vi.mock(`#server/lib/db.ts`, async (importOriginal) => ({
  ...(await importOriginal<typeof import("#server/lib/db.ts")>()),
  withDrizzle: mockWithDrizzle,
}));

function virtualAuthenticator() {
  const { privateKey, publicKey } = generateKeyPairSync(`ec`, {
    namedCurve: `prime256v1`,
  });
  const jwk = publicKey.export({ format: `jwk` });
  const credentialId = randomBytes(200);
  const id = credentialId.toString(`base64url`);
  const cose = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x ?? ``, `base64url`)],
      [-3, Buffer.from(jwk.y ?? ``, `base64url`)],
    ]),
  );

  function authData(rpId: string, flags: number, counter: number) {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(counter);
    return Buffer.concat([
      createHash(`sha256`).update(rpId).digest(),
      Buffer.from([flags]),
      count,
    ]);
  }

  return {
    id,
    registration(
      challenge: string,
      origin = `http://localhost:8081`,
      rpId = `localhost`,
      flags = 0x45,
    ): RegistrationResponseJSON {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(credentialId.length);
      const data = Buffer.concat([
        authData(rpId, flags, 0),
        Buffer.alloc(16),
        length,
        credentialId,
        cose,
      ]);
      return {
        id,
        rawId: id,
        type: `public-key`,
        clientExtensionResults: { credProps: { rk: true } },
        response: {
          clientDataJSON: Buffer.from(
            JSON.stringify({ type: `webauthn.create`, challenge, origin }),
          ).toString(`base64url`),
          attestationObject: Buffer.from(
            isoCBOR.encode(
              new Map<string, string | Map<string, never> | Uint8Array>([
                [`fmt`, `none`],
                [`attStmt`, new Map<string, never>()],
                [`authData`, data],
              ]),
            ),
          ).toString(`base64url`),
          transports: [`internal`],
        },
      };
    },
    authentication(
      challenge: string,
      userId: string,
      counter = 1,
      origin = `http://localhost:8081`,
      rpId = `localhost`,
      flags = 0x05,
    ): AuthenticationResponseJSON {
      const data = authData(rpId, flags, counter);
      const clientData = Buffer.from(
        JSON.stringify({ type: `webauthn.get`, challenge, origin }),
      );
      const signature = sign(
        `sha256`,
        Buffer.concat([data, createHash(`sha256`).update(clientData).digest()]),
        privateKey,
      );
      return {
        id,
        rawId: id,
        type: `public-key`,
        clientExtensionResults: {},
        response: {
          authenticatorData: data.toString(`base64url`),
          clientDataJSON: clientData.toString(`base64url`),
          signature: signature.toString(`base64url`),
          userHandle: Buffer.from(userId).toString(`base64url`),
        },
      };
    },
  };
}

function useDatabase(db: TestDb) {
  mockWithDrizzle.mockImplementation(
    async (callback: (db: TestDb) => Promise<unknown>) => callback(db),
  );
}

function caller(
  session: { id: string; userId: string; expiresAt: Date } | null = null,
) {
  return authRouter.createCaller({ session });
}

async function createPasskeyAccount(displayName = `Learner`) {
  const account = await caller().createPasskeyAccount({ displayName });
  const client = caller({
    id: account.session.id,
    userId: account.user.id,
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { client, account };
}

async function signup() {
  const { client, account } = await createPasskeyAccount();
  const authenticator = virtualAuthenticator();
  const start = await client.startAddPasskey();
  expect(start.options.authenticatorSelection).toMatchObject({
    residentKey: `required`,
    userVerification: `required`,
  });
  const response = authenticator.registration(start.options.challenge);
  await client.completeAddPasskey({
    cookie: start.cookie,
    response,
  });
  return { client, authenticator, result: account, response, start };
}

beforeEach(() => {
  vi.stubEnv(`PYLY_WEBAUTHN_RP_ID`, `localhost`);
  vi.stubEnv(`PYLY_WEBAUTHN_ORIGINS`, `http://localhost:8081`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  mockWithDrizzle.mockReset();
});

describe(`passkey ceremonies`, () => {
  dbTest(
    `creates a passkey account without requiring a display name`,
    async ({ db }) => {
      useDatabase(db);
      const account = await caller().createPasskeyAccount({});
      expect(account.user.name).toBeNull();
      expect(await db.query.user.findMany()).toHaveLength(1);
      expect(await db.query.authSession.findMany()).toHaveLength(1);
      expect(await db.query.userSetting.findMany()).toHaveLength(0);
      const client = caller({
        id: account.session.id,
        userId: account.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const authenticator = virtualAuthenticator();
      const start = await client.startAddPasskey();
      expect(start.options.user.name).toBe(`Pinyinly account`);
      await client.completeAddPasskey({
        cookie: start.cookie,
        response: authenticator.registration(start.cookie),
      });
      expect(await db.query.authPasskey.findMany()).toHaveLength(1);
    },
  );

  dbTest(
    `signs up and logs in using real signed responses and long credential IDs`,
    async ({ db }) => {
      useDatabase(db);
      const { client, authenticator, result } = await signup();
      expect(authenticator.id.length).toBeGreaterThan(100);
      expect(result.user.name).toBe(`Learner`);
      const start = await client.startPasskeyAuthentication();
      expect(start.options.userVerification).toBe(`required`);
      const input = {
        cookie: start.cookie,
        response: authenticator.authentication(start.cookie, result.user.id),
      };
      const login = await client.completePasskeyAuthentication(input);
      expect(login.user.id).toBe(result.user.id);
      expect(login.session.id).not.toBe(result.session.id);
      await expect(
        client.completePasskeyAuthentication(input),
      ).rejects.toThrow();
      const credential = await db.query.authPasskey.findFirst();
      expect(credential).toMatchObject({ counter: 1, name: null });
      expect(credential?.lastUsedAt).toBeInstanceOf(Date);
    },
  );

  dbTest(
    `registration is single-use and duplicate credentials do not modify the account`,
    async ({ db }) => {
      useDatabase(db);
      const { client, authenticator, response, start } = await signup();
      await expect(
        client.completeAddPasskey({ cookie: start.cookie, response }),
      ).rejects.toThrow();
      const duplicate = await client.startAddPasskey();
      await expect(
        client.completeAddPasskey({
          cookie: duplicate.cookie,
          response: authenticator.registration(duplicate.cookie),
        }),
      ).rejects.toThrow();
      expect(await db.query.user.findMany()).toHaveLength(1);
      expect(await db.query.authSession.findMany()).toHaveLength(1);
      expect(await db.query.authPasskey.findMany()).toHaveLength(1);
    },
  );

  dbTest(
    `rejects wrong origins, RP IDs, UV flags, challenges, expired requests and ceremony kinds`,
    async ({ db }) => {
      useDatabase(db);
      const { client } = await createPasskeyAccount();
      const authenticator = virtualAuthenticator();
      const start = await client.startAddPasskey();
      for (const response of [
        authenticator.registration(start.cookie, `https://evil.example`),
        authenticator.registration(start.cookie, undefined, `evil.example`),
        authenticator.registration(start.cookie, undefined, undefined, 0x41),
        authenticator.registration(`wrong-challenge`),
      ]) {
        await expect(
          client.completeAddPasskey({
            cookie: start.cookie,
            response,
          }),
        ).rejects.toThrow();
      }
      const login = await client.startPasskeyAuthentication();
      await expect(
        client.completeAddPasskey({
          cookie: login.cookie,
          response: authenticator.registration(login.cookie),
        }),
      ).rejects.toThrow();
      await db.update(s.authPasskeyChallenge).set({ expiresAt: new Date(0) });
      await expect(
        client.completeAddPasskey({
          cookie: start.cookie,
          response: authenticator.registration(start.cookie),
        }),
      ).rejects.toThrow();
      expect(await db.query.user.findMany()).toHaveLength(1);
      expect(await db.query.authSession.findMany()).toHaveLength(1);
    },
  );

  dbTest(
    `rejects invalid signatures, user handles, origins, UV and stale counters without issuing sessions`,
    async ({ db }) => {
      useDatabase(db);
      const { client, authenticator, result } = await signup();
      const start = await client.startPasskeyAuthentication();
      const response = authenticator.authentication(
        start.cookie,
        result.user.id,
      );
      for (const invalid of [
        {
          ...response,
          response: {
            ...response.response,
            signature: Buffer.alloc(64).toString(`base64url`),
          },
        },
        authenticator.authentication(start.cookie, `another-user`),
        authenticator.authentication(
          start.cookie,
          result.user.id,
          1,
          `https://evil.example`,
        ),
        authenticator.authentication(
          start.cookie,
          result.user.id,
          1,
          undefined,
          `evil.example`,
        ),
        authenticator.authentication(
          start.cookie,
          result.user.id,
          1,
          undefined,
          undefined,
          0x01,
        ),
      ]) {
        await expect(
          client.completePasskeyAuthentication({
            cookie: start.cookie,
            response: invalid,
          }),
        ).rejects.toThrow();
      }
      expect(await db.query.authSession.findMany()).toHaveLength(1);
      await client.completePasskeyAuthentication({
        cookie: start.cookie,
        response,
      });
      const next = await client.startPasskeyAuthentication();
      await expect(
        client.completePasskeyAuthentication({
          cookie: next.cookie,
          response: authenticator.authentication(
            next.cookie,
            result.user.id,
            1,
          ),
        }),
      ).rejects.toThrow();
      expect(await db.query.authSession.findMany()).toHaveLength(2);
    },
  );

  dbTest(
    `production requires the new RP and accepts both related origins`,
    async ({ db }) => {
      useDatabase(db);
      vi.stubEnv(`PYLY_WEBAUTHN_RP_ID`, `pinyinly.com`);
      vi.stubEnv(
        `PYLY_WEBAUTHN_ORIGINS`,
        `https://pinyin.ly,https://www.pinyin.ly`,
      );
      const { client, account } = await createPasskeyAccount(`Production`);
      for (const origin of [`https://pinyin.ly`, `https://www.pinyin.ly`]) {
        const authenticator = virtualAuthenticator();
        const start = await client.startAddPasskey();
        expect(start.options.rp.id).toBe(`pinyinly.com`);
        await client.completeAddPasskey({
          cookie: start.cookie,
          response: authenticator.registration(
            start.cookie,
            origin,
            `pinyinly.com`,
          ),
        });
        const login = await client.startPasskeyAuthentication();
        await expect(
          client.completePasskeyAuthentication({
            cookie: login.cookie,
            response: authenticator.authentication(
              login.cookie,
              account.user.id,
              1,
              origin,
              `pinyinly.com`,
            ),
          }),
        ).resolves.toMatchObject({ user: { id: account.user.id } });
      }
    },
  );
});

describe(`passkey management`, () => {
  dbTest(
    `serializes competing completions and last-passkey removals`,
    async ({ db }) => {
      useDatabase(db);
      const { client, result, authenticator } = await signup();
      const login = await client.startPasskeyAuthentication();
      const input = {
        cookie: login.cookie,
        response: authenticator.authentication(login.cookie, result.user.id),
      };
      const completions = await Promise.allSettled([
        client.completePasskeyAuthentication(input),
        client.completePasskeyAuthentication(input),
      ]);
      expect(
        completions.filter((item) => item.status === `fulfilled`),
      ).toHaveLength(1);
      const owner = caller({
        id: result.session.id,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const second = virtualAuthenticator();
      const start = await owner.startAddPasskey();
      await owner.completeAddPasskey({
        cookie: start.cookie,
        response: second.registration(start.cookie),
        name: `Second`,
      });
      const removals = await Promise.allSettled([
        owner.removePasskey({ id: authenticator.id }),
        owner.removePasskey({ id: second.id }),
      ]);
      expect(
        removals.filter((item) => item.status === `fulfilled`),
      ).toHaveLength(1);
      expect(await owner.listPasskeys()).toHaveLength(1);
    },
  );

  dbTest(
    `adds multiple passkeys to an Apple account, renames and removes without replacing its session`,
    async ({ db }) => {
      useDatabase(db);
      const user = { id: `apple-user` };
      await db.insert(s.user).values(user);
      await db.insert(s.authOAuth2).values({
        provider: `apple`,
        providerUserId: `apple-subject`,
        userId: user.id,
      });
      const session = {
        id: `apple-session`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      };
      await db.insert(s.authSession).values(session);
      const client = caller(session);
      const first = virtualAuthenticator();
      const second = virtualAuthenticator();
      for (const [index, authenticator] of [first, second].entries()) {
        const start = await client.startAddPasskey();
        expect(start.options.user.id).toBe(
          Buffer.from(user.id).toString(`base64url`),
        );
        expect(start.options.excludeCredentials).toHaveLength(index);
        await client.completeAddPasskey({
          cookie: start.cookie,
          response: authenticator.registration(start.cookie),
          name: `Key ${index}`,
        });
      }
      expect(await db.query.user.findMany()).toHaveLength(1);
      expect(await db.query.authSession.findMany()).toEqual([session]);
      expect(await client.listPasskeys()).toHaveLength(2);
      await client.renamePasskey({ id: first.id, name: `Renamed` });
      expect(await client.listPasskeys()).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: `Renamed` })]),
      );
      await client.removePasskey({ id: second.id });
      await expect(client.removePasskey({ id: first.id })).rejects.toThrow();
      expect(await db.query.authOAuth2.findMany()).toHaveLength(1);
      const login = await caller().startPasskeyAuthentication();
      await expect(
        caller().completePasskeyAuthentication({
          cookie: login.cookie,
          response: second.authentication(login.cookie, user.id),
        }),
      ).rejects.toThrow();
    },
  );

  dbTest(
    `isolates accounts, sessions and private credential metadata`,
    async ({ db }) => {
      useDatabase(db);
      const { result, authenticator } = await signup();
      const owner = caller({
        id: result.session.id,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const other = { id: `other-user` };
      await db.insert(s.user).values(other);
      const outsider = caller({
        id: `other-session`,
        userId: other.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      expect(await outsider.listPasskeys()).toEqual([]);
      await expect(
        outsider.renamePasskey({ id: authenticator.id, name: `Stolen` }),
      ).rejects.toThrow();
      await expect(
        outsider.removePasskey({ id: authenticator.id }),
      ).rejects.toThrow();
      const start = await owner.startAddPasskey();
      const response = virtualAuthenticator().registration(start.cookie);
      await expect(
        caller().completeAddPasskey({ cookie: start.cookie, response }),
      ).rejects.toThrow();
      const otherSession = caller({
        id: `different-owner-session`,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(
        otherSession.completeAddPasskey({
          cookie: start.cookie,
          response,
          name: `Extra`,
        }),
      ).resolves.toMatchObject({ verified: true });
      const [listed] = await owner.listPasskeys();
      expect(Object.keys(listed ?? {}).sort()).toEqual([
        `createdAt`,
        `id`,
        `lastUsedAt`,
        `name`,
      ]);
      await expect(caller().startAddPasskey()).rejects.toThrow();
      await expect(caller().listPasskeys()).rejects.toThrow();
    },
  );
});
