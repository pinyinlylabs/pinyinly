import { GET } from "#app/.well-known/webauthn+api.ts";
import {
  getPasskeyConfig,
  relatedPasskeyOrigins,
} from "#server/lib/passkey.ts";
import { describe, expect, test } from "vitest";

describe(`passkey RP configuration`, () => {
  test(`uses explicit production and local origins`, () => {
    expect(getPasskeyConfig({ NODE_ENV: `production` })).toEqual({
      rpId: `pinyinly.com`,
      origins: relatedPasskeyOrigins,
    });
    expect(getPasskeyConfig({ NODE_ENV: `development` })).toEqual({
      rpId: `localhost`,
      origins: [`http://localhost:8081`],
    });
    expect(
      getPasskeyConfig({
        NODE_ENV: `production`,
        PYLY_WEBAUTHN_RP_ID: `localhost`,
        PYLY_WEBAUTHN_ORIGINS: `http://localhost:8081, http://localhost:8082`,
      }).origins,
    ).toHaveLength(2);
  });

  test(`rejects untrusted origins, URLs with paths, and unsupported RP IDs`, () => {
    for (const origin of [
      `https://evil.example`,
      `https://pinyin.ly/path`,
      `http://pinyin.ly`,
      `https://preview.vercel.app`,
      ``,
    ]) {
      expect(() =>
        getPasskeyConfig({
          NODE_ENV: `production`,
          PYLY_WEBAUTHN_ORIGINS: origin,
        }),
      ).toThrow();
    }
    expect(() =>
      getPasskeyConfig({ PYLY_WEBAUTHN_RP_ID: `pinyin.ly` }),
    ).toThrow();
    expect(() =>
      getPasskeyConfig({
        PYLY_WEBAUTHN_RP_ID: `localhost`,
        PYLY_WEBAUTHN_ORIGINS: `http://127.0.0.1:8081`,
      }),
    ).toThrow();
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
