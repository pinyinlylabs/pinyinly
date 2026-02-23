import * as Crypto from "expo-crypto";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ``;
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }

  if (typeof btoa === `function`) {
    return btoa(binary);
  }

  return Buffer.from(binary, `binary`).toString(`base64`);
}

function toBase64Url(base64: string): string {
  return base64
    .replaceAll(`+`, `-`)
    .replaceAll(`/`, `_`)
    .replaceAll(/=+$/gu, ``);
}

export async function getBlobSha256Base64Url(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    buffer,
  );
  const base64 = bytesToBase64(new Uint8Array(digest));
  const hash = toBase64Url(base64);
  return `sha256/${hash}`;
}
