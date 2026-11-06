import { GET } from "#app/.well-known/webauthn+api.ts";
import {
  getExpectedPasskeyOrigin,
  getPasskeyConfig,
  passkeyNameFromAaguid,
  relatedPasskeyOrigins,
} from "#server/lib/passkey.ts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe(`passkey RP configuration`, () => {
  beforeEach(() => {
    vi.stubEnv(`NODE_ENV`, `development`);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test(`uses explicit production and local origins`, () => {
    expect(getPasskeyConfig()).toEqual({
      rpId: `localhost`,
      origins: [],
    });
    vi.stubEnv(`NODE_ENV`, `production`);
    expect(getPasskeyConfig()).toEqual({
      rpId: `pinyinly.com`,
      origins: relatedPasskeyOrigins,
    });
  });

  describe(`passkey AAGUID names`, () => {
    const knownAaguid = `fcb1bcb4-f370-078c-6993-bc24d0ae3fbe`;
    const knownName = `Ledger Nano X FIDO2 Authenticator`;

    test(`uses the bundled name and falls back to Passkey for unknown AAGUIDs`, () => {
      expect(passkeyNameFromAaguid(knownAaguid, [])).toBe(knownName);
      expect(
        passkeyNameFromAaguid(`00000000-0000-0000-0000-000000000000`, []),
      ).toBe(`Passkey`);
    });
  });

  test(`accepts any local port but keeps production origins exact`, () => {
    const clientDataJSON = (origin: string) =>
      Buffer.from(
        JSON.stringify({ type: `webauthn.create`, challenge: `test`, origin }),
      ).toString(`base64url`);
    const localConfig = getPasskeyConfig();
    expect(
      getExpectedPasskeyOrigin(
        localConfig,
        clientDataJSON(`http://localhost:8084`),
      ),
    ).toBe(`http://localhost:8084`);

    for (const origin of [
      `http://127.0.0.1:8084`,
      `http://localhost.example:8084`,
      `https://pinyin.ly`,
    ]) {
      expect(() =>
        getExpectedPasskeyOrigin(localConfig, clientDataJSON(origin)),
      ).toThrow();
    }

    vi.stubEnv(`NODE_ENV`, `production`);
    expect(
      getExpectedPasskeyOrigin(
        getPasskeyConfig(),
        clientDataJSON(`https://pinyin.ly`),
      ),
    ).toEqual(relatedPasskeyOrigins);
  });

  test(`rejects untrusted localhost origins`, () => {
    const localConfig = getPasskeyConfig();
    for (const origin of [
      `https://evil.example`,
      `https://pinyin.ly/path`,
      `http://pinyin.ly`,
      `https://preview.vercel.app`,
      ``,
    ]) {
      expect(() =>
        getExpectedPasskeyOrigin(
          localConfig,
          Buffer.from(
            JSON.stringify({
              type: `webauthn.create`,
              challenge: `test`,
              origin,
            }),
          ).toString(`base64url`),
        ),
      ).toThrow();
    }
  });

  test(`serves the exact related-origins document without a redirect`, async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get(`content-type`)).toContain(`application/json`);
    expect(response.headers.get(`location`)).toBeNull();
    expect(await response.json()).toEqual({
      origins: [`https://pinyin.ly`, `https://www.pinyin.ly`],
    });
  });
});
