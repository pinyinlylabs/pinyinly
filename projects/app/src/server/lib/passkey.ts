import aaguids from "aaguids";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { uniqueNameWithSuffix } from "@/util/unicode";

const textEncoder = new TextEncoder();

export const relatedPasskeyOrigins = [
  `https://pinyin.ly`,
  `https://www.pinyin.ly`,
];

export function passkeyEncodeUserId(userId: string) {
  return textEncoder.encode(userId);
}

export function passkeyNameFromAaguid(
  aaguid: string,
  existingNames: (string | null)[],
) {
  const baseName = aaguids[aaguid.toLowerCase()] ?? `Passkey`;
  return uniqueNameWithSuffix(baseName, existingNames);
}

export function getPasskeyConfig() {
  const rpId: `pinyinly.com` | `localhost` =
    process.env.NODE_ENV === `production` ? `pinyinly.com` : `localhost`;
  return {
    rpId,
    origins: rpId === `localhost` ? [] : relatedPasskeyOrigins,
  };
}

export function getExpectedPasskeyOrigin(
  config: ReturnType<typeof getPasskeyConfig>,
  clientDataJSON: string,
): string | string[] {
  if (config.rpId !== `localhost`) {
    return config.origins;
  }

  const origin = decodeClientDataJSON(clientDataJSON).origin;
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.hostname !== `localhost` ||
    ![`http:`, `https:`].includes(url.protocol)
  ) {
    throw new Error(`Invalid WebAuthn origin for localhost: ${origin}`);
  }
  return origin;
}
