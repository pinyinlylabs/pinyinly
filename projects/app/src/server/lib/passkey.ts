import { z } from "zod";

export const relatedPasskeyOrigins = [
  `https://pinyin.ly`,
  `https://www.pinyin.ly`,
];

export function getPasskeyConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env,
) {
  const rpId = z
    .enum([`pinyinly.com`, `localhost`])
    .parse(
      env.PYLY_WEBAUTHN_RP_ID ??
        (env.NODE_ENV === `production` ? `pinyinly.com` : `localhost`),
    );
  const origins = z
    .array(z.url())
    .min(1)
    .parse(
      env.PYLY_WEBAUTHN_ORIGINS?.split(`,`).map((value) => value.trim()) ??
        (rpId === `localhost`
          ? [`http://localhost:8081`]
          : relatedPasskeyOrigins),
    );
  for (const origin of origins) {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      (rpId === `localhost`
        ? url.hostname !== `localhost` ||
          ![`http:`, `https:`].includes(url.protocol)
        : !relatedPasskeyOrigins.includes(origin))
    ) {
      throw new Error(`Invalid WebAuthn origin for ${rpId}: ${origin}`);
    }
  }
  return { rpId, origins };
}
